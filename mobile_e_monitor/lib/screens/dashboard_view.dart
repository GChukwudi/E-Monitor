// ignore_for_file: unused_field

import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'dart:async';
import '../models/prepaid_meter_data.dart';
import '../widgets/metric_card.dart';

class DashboardView extends StatefulWidget {
  final String unitId;
  final String buildingId;

  const DashboardView({
    super.key,
    required this.unitId,
    this.buildingId = 'building_001',
  });

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  final DatabaseReference _database = FirebaseDatabase.instance.ref();
  PrepaidMeterData? _liveData;
  StreamSubscription? _subscription;
  bool _isConnected = false;

  @override
  void initState() {
    super.initState();
    _checkConnection();
    _listenToData();
  }

  void _checkConnection() async {
    try {
      final snapshot = await _database
          .child('buildings/${widget.buildingId}/units/${widget.unitId}')
          .once();

      if (snapshot.snapshot.value != null) {
        setState(() {
          _isConnected = true;
        });
      }
    } catch (e) {
      setState(() {
        _isConnected = false;
      });
    }
  }

  @override
  void didUpdateWidget(DashboardView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.unitId != widget.unitId ||
        oldWidget.buildingId != widget.buildingId) {
      _subscription?.cancel();
      _listenToData();
    }
  }

  void _listenToData() {
    final path = 'buildings/${widget.buildingId}/units/${widget.unitId}';

    _subscription = _database.child(path).onValue.listen((event) {
      if (event.snapshot.value != null) {
        final data = event.snapshot.value as Map<dynamic, dynamic>;

        // Check if unit is still active
        if (!(data['isActive'] ?? true)) {
          _showUnitDeactivatedDialog();
          return;
        }

        setState(() {
          _liveData = PrepaidMeterData.fromMap(data);
          _isConnected = true;
        });
      }
    }, onError: (error) {
      setState(() {
        _isConnected = false;
      });
    });
  }

  void _showUnitDeactivatedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Unit Deactivated'),
        content: const Text(
            'Your unit has been deactivated by the property manager. Please contact them for assistance.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/login',
                (route) => false,
              );
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  String _formatNaira(double amount) {
    return '₦${amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}';
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_liveData == null)
            const Center(
              child: Column(
                children: [
                  SizedBox(height: 40),
                  CircularProgressIndicator(
                    color: Color(0xFF84A98C),
                  ),
                  SizedBox(height: 20),
                  Text(
                    'Loading data...',
                    style: TextStyle(
                      fontSize: 15,
                      color: Color(0xFF3D405B),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Please wait while we fetch your meter information',
                    style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                  ),
                ],
              ),
            )
          else ...[
            // PREPAID CREDIT DISPLAY - MODERN CARD
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: _liveData!.lowCreditAlert
                    ? const Color(0xFFE07A5F)
                    : const Color(0xFF84A98C),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.account_balance_wallet_outlined,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Balance',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Credit Remaining',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.9),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _formatNaira(_liveData!.remainingCredit),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Units Left',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${_liveData!.remainingUnits.toStringAsFixed(1)} kWh',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (_liveData!.lowCreditAlert)
                    Container(
                      margin: const EdgeInsets.only(top: 20),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.warning_amber_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Low credit alert! Please recharge to avoid disconnection.',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.95),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Live Metrics Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                MetricCard(
                  title: 'Power',
                  value: '${_liveData!.power.toStringAsFixed(1)}W',
                  icon: Icons.power_outlined,
                  color: const Color(0xFF84A98C),
                ),
                MetricCard(
                  title: 'Energy Used',
                  value: '${_liveData!.energyUsed.toStringAsFixed(2)}kWh',
                  icon: Icons.trending_up_outlined,
                  color: const Color(0xFFA855F7),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Today's Summary Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Today\'s Summary',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF3D405B),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _QuickStat(
                        label: 'Used Today',
                        value:
                            '${_liveData!.energyUsed.toStringAsFixed(1)} kWh',
                        icon: Icons.electric_meter_outlined,
                      ),
                      Container(
                        width: 1,
                        height: 40,
                        color: const Color(0xFFE5E7EB),
                      ),
                      _QuickStat(
                        label: 'Cost Today',
                        value: _formatNaira(_liveData!.energyUsed * 100),
                        icon: Icons.payments_outlined,
                      ),
                      Container(
                        width: 1,
                        height: 40,
                        color: const Color(0xFFE5E7EB),
                      ),
                      _QuickStat(
                        label: 'Days Left',
                        value: (_liveData!.remainingUnits /
                                (_liveData!.energyUsed > 0
                                    ? _liveData!.energyUsed
                                    : 1))
                            .toStringAsFixed(0),
                        icon: Icons.calendar_today_outlined,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Last Update
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.access_time, size: 14, color: Colors.grey[400]),
                const SizedBox(width: 6),
                Text(
                  'Last updated: ${_liveData!.timestamp}',
                  style:
                      const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Recharge Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  _showRechargeDialog(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF84A98C),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add_card_outlined),
                    SizedBox(width: 8),
                    Text(
                      'Recharge Meter',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showRechargeDialog(BuildContext context) {
    final amountController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with icon
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF84A98C).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.account_balance_wallet_outlined,
                        color: Color(0xFF84A98C),
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Text(
                        'Recharge Meter',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                          color: Color(0xFF3D405B),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Description
                const Text(
                  'Enter recharge amount in Naira',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 14,
                  ),
                ),

                const SizedBox(height: 16),

                // Amount input field
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF3D405B),
                  ),
                  decoration: InputDecoration(
                    labelText: 'Amount',
                    labelStyle: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 14,
                    ),
                    prefixIcon: const Padding(
                      padding: EdgeInsets.only(left: 16, top: 14),
                      child: Text(
                        '₦',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF84A98C),
                        ),
                      ),
                    ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 0),
                    filled: true,
                    fillColor: const Color(0xFFF5F5F4),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                        color: Color(0xFFE5E7EB),
                        width: 1,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                        color: Color(0xFF84A98C),
                        width: 2,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // Rate info box
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF84A98C).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF84A98C).withOpacity(0.2),
                    ),
                  ),
                  child: const Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 18,
                        color: Color(0xFF84A98C),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Rate: ₦209.5 per kWh',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF3D405B),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Based on Band A tariff',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(
                            color: Color(0xFF6B7280),
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () {
                          final amount =
                              double.tryParse(amountController.text) ?? 0;
                          if (amount > 0) {
                            _processRecharge(amount);
                            Navigator.pop(context);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF84A98C),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Recharge Now',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _processRecharge(double amount) {
    final units = amount / 209.5; // Updated to ₦209.5 per kWh
    final newCredit = (_liveData?.remainingCredit ?? 0) + amount;
    final newUnits = (_liveData?.remainingUnits ?? 0) + units;

    _database
        .child('buildings/${widget.buildingId}/units/${widget.unitId}')
        .update({
      'remaining_credit': newCredit,
      'remaining_units': newUnits,
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Recharged ${_formatNaira(amount)} successfully! Added ${units.toStringAsFixed(2)} kWh',
        ),
        backgroundColor: const Color(0xFF84A98C),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}

class _QuickStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _QuickStat({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF84A98C)),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: Color(0xFF3D405B),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
