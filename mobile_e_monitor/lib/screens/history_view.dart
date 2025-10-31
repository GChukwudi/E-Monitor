// ignore_for_file: unnecessary_to_list_in_spreads, unused_local_variable

import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'dart:async';
import '../widgets/time_range_button.dart';
import '../widgets/stat_row.dart';

class HistoryView extends StatefulWidget {
  final String unitId;
  final String buildingId;

  const HistoryView({
    super.key,
    required this.unitId,
    this.buildingId = 'building_001',
  });

  @override
  State<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends State<HistoryView> {
  final DatabaseReference _database = FirebaseDatabase.instance.ref();
  String _timeRange = '24h';
  bool _isLoading = true;
  String? _errorMessage;

  // Statistics data
  double _avgPower = 0;
  double _peakPower = 0;
  double _totalEnergy = 0;
  double _estimatedCost = 0;

  // Hourly breakdown data
  List<Map<String, dynamic>> _hourlyData = [];

  // Helper function to safely convert to double
  double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  @override
  void initState() {
    super.initState();
    _loadHistoryData();
  }

  @override
  void didUpdateWidget(HistoryView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.unitId != widget.unitId ||
        oldWidget.buildingId != widget.buildingId) {
      _loadHistoryData();
    }
  }

  Future<void> _loadHistoryData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      switch (_timeRange) {
        case '24h':
          await _load24HourData();
          break;
        case '7d':
          await _load7DayData();
          break;
        case '30d':
          await _load30DayData();
          break;
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading data: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _load24HourData() async {
    final now = DateTime.now();
    final today = _formatDate(now);

    final path =
        'buildings/${widget.buildingId}/units/${widget.unitId}/history/hourly/$today';

    final snapshot = await _database.child(path).get();

    if (!snapshot.exists) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'No data available for today';
      });
      return;
    }

    final data = snapshot.value as Map<dynamic, dynamic>;
    _process24HourData(data, now);
  }

  void _process24HourData(Map<dynamic, dynamic> data, DateTime now) {
    double totalPower = 0;
    double maxPower = 0;
    double totalEnergySum = 0;
    int sampleCount = 0;

    // Group into 6-hour periods
    Map<String, Map<String, double>> periods = {
      '00:00 - 06:00': {'energy': 0, 'samples': 0},
      '06:00 - 12:00': {'energy': 0, 'samples': 0},
      '12:00 - 18:00': {'energy': 0, 'samples': 0},
      '18:00 - 24:00': {'energy': 0, 'samples': 0},
    };

    data.forEach((hourKey, hourData) {
      final hour = int.tryParse(hourKey.toString());
      if (hour == null || hourData == null) return;

      final hourMap = hourData as Map<dynamic, dynamic>;
      final energy = _toDouble(hourMap['energy'] ?? 0);
      final avgPower = _toDouble(hourMap['avgPower'] ?? 0);
      final peakPower = _toDouble(hourMap['peakPower'] ?? 0);

      totalPower += avgPower;
      totalEnergySum += energy;
      sampleCount++;

      if (peakPower > maxPower) {
        maxPower = peakPower;
      }

      // Assign to period
      String period;
      if (hour < 6) {
        period = '00:00 - 06:00';
      } else if (hour < 12) {
        period = '06:00 - 12:00';
      } else if (hour < 18) {
        period = '12:00 - 18:00';
      } else {
        period = '18:00 - 24:00';
      }

      periods[period]!['energy'] = periods[period]!['energy']! + energy;
      periods[period]!['samples'] = periods[period]!['samples']! + 1;
    });

    // Find max energy for percentage calculation
    double maxEnergy = 0;
    periods.forEach((_, values) {
      if (values['energy']! > maxEnergy) {
        maxEnergy = values['energy']!;
      }
    });

    // Build hourly data list
    List<Map<String, dynamic>> hourlyList = [];
    periods.forEach((timeRange, values) {
      final energy = values['energy']!;
      final percent = maxEnergy > 0 ? (energy / maxEnergy).toDouble() : 0.0;

      hourlyList.add({
        'time': timeRange,
        'usage': '${energy.toStringAsFixed(2)} kWh',
        'percent': percent,
      });
    });

    setState(() {
      _avgPower = sampleCount > 0 ? totalPower / sampleCount : 0;
      _peakPower = maxPower;
      _totalEnergy = totalEnergySum;
      _estimatedCost = totalEnergySum * 209.5; // ₦209.5 per kWh
      _hourlyData = hourlyList;
      _isLoading = false;
    });
  }

  Future<void> _load7DayData() async {
    final now = DateTime.now();
    final dates = List.generate(7, (index) {
      final date = now.subtract(Duration(days: index));
      return _formatDate(date);
    });

    double totalPower = 0;
    double maxPower = 0;
    double totalEnergySum = 0;
    int sampleCount = 0;

    List<Map<String, dynamic>> dailyList = [];

    for (final date in dates) {
      final path =
          'buildings/${widget.buildingId}/units/${widget.unitId}/history/hourly/$date';

      final snapshot = await _database.child(path).get();

      if (snapshot.exists) {
        final data = snapshot.value as Map<dynamic, dynamic>;

        double dayEnergy = 0;
        double dayMaxPower = 0;
        double dayAvgPowerSum = 0;
        int dayHours = 0;

        data.forEach((hourKey, hourData) {
          if (hourData == null) return;
          final hourMap = hourData as Map<dynamic, dynamic>;

          final energy = _toDouble(hourMap['energy'] ?? 0);
          final avgPower = _toDouble(hourMap['avgPower'] ?? 0);
          final peakPower = _toDouble(hourMap['peakPower'] ?? 0);

          dayEnergy += energy;
          dayAvgPowerSum += avgPower;
          dayHours++;

          if (peakPower > dayMaxPower) {
            dayMaxPower = peakPower;
          }
        });

        totalEnergySum += dayEnergy;
        totalPower += dayAvgPowerSum;
        sampleCount += dayHours;

        if (dayMaxPower > maxPower) {
          maxPower = dayMaxPower;
        }

        dailyList.add({
          'date': date,
          'energy': dayEnergy,
          'avgPower': dayHours > 0 ? dayAvgPowerSum / dayHours : 0,
        });
      }
    }

    // Find max energy for percentage
    double maxEnergy = 0;
    for (final day in dailyList) {
      if (day['energy'] > maxEnergy) {
        maxEnergy = day['energy'];
      }
    }

    // Convert to display format with percentages
    List<Map<String, dynamic>> displayList = [];
    for (final day in dailyList.reversed) {
      final energy = _toDouble(day['energy']);
      final percent = maxEnergy > 0 ? (energy / maxEnergy).toDouble() : 0.0;

      displayList.add({
        'time': _formatDisplayDate(day['date']),
        'usage': '${energy.toStringAsFixed(2)} kWh',
        'percent': percent,
      });
    }

    setState(() {
      _avgPower = sampleCount > 0 ? totalPower / sampleCount : 0;
      _peakPower = maxPower;
      _totalEnergy = totalEnergySum;
      _estimatedCost = totalEnergySum * 209.5;
      _hourlyData = displayList;
      _isLoading = false;
    });
  }

  Future<void> _load30DayData() async {
    final now = DateTime.now();
    final dates = List.generate(30, (index) {
      final date = now.subtract(Duration(days: index));
      return _formatDate(date);
    });

    double totalPower = 0;
    double maxPower = 0;
    double totalEnergySum = 0;
    int sampleCount = 0;

    List<Map<String, dynamic>> dailyList = [];

    for (final date in dates) {
      final path =
          'buildings/${widget.buildingId}/units/${widget.unitId}/history/hourly/$date';

      final snapshot = await _database.child(path).get();

      if (snapshot.exists) {
        final data = snapshot.value as Map<dynamic, dynamic>;

        double dayEnergy = 0;
        double dayMaxPower = 0;
        double dayAvgPowerSum = 0;
        int dayHours = 0;

        data.forEach((hourKey, hourData) {
          if (hourData == null) return;
          final hourMap = hourData as Map<dynamic, dynamic>;

          final energy = _toDouble(hourMap['energy'] ?? 0);
          final avgPower = _toDouble(hourMap['avgPower'] ?? 0);
          final peakPower = _toDouble(hourMap['peakPower'] ?? 0);

          dayEnergy += energy;
          dayAvgPowerSum += avgPower;
          dayHours++;

          if (peakPower > dayMaxPower) {
            dayMaxPower = peakPower;
          }
        });

        totalEnergySum += dayEnergy;
        totalPower += dayAvgPowerSum;
        sampleCount += dayHours;

        if (dayMaxPower > maxPower) {
          maxPower = dayMaxPower;
        }

        dailyList.add({
          'date': date,
          'energy': dayEnergy,
          'avgPower': dayHours > 0 ? dayAvgPowerSum / dayHours : 0,
        });
      }
    }

    // Group by week for 30-day view
    Map<String, Map<String, double>> weeks = {
      'Week 1 (Most Recent)': {'energy': 0, 'samples': 0},
      'Week 2': {'energy': 0, 'samples': 0},
      'Week 3': {'energy': 0, 'samples': 0},
      'Week 4': {'energy': 0, 'samples': 0},
    };

    for (int i = 0; i < dailyList.length; i++) {
      final day = dailyList[i];
      String week;
      if (i < 7) {
        week = 'Week 1 (Most Recent)';
      } else if (i < 14) {
        week = 'Week 2';
      } else if (i < 21) {
        week = 'Week 3';
      } else {
        week = 'Week 4';
      }

      weeks[week]!['energy'] = weeks[week]!['energy']! + day['energy'];
      weeks[week]!['samples'] = weeks[week]!['samples']! + 1;
    }

    // Find max energy
    double maxEnergy = 0;
    weeks.forEach((_, values) {
      if (values['energy']! > maxEnergy) {
        maxEnergy = values['energy']!;
      }
    });

    // Build display list
    List<Map<String, dynamic>> displayList = [];
    weeks.forEach((weekLabel, values) {
      final energy = values['energy']!;
      final percent = maxEnergy > 0 ? (energy / maxEnergy).toDouble() : 0.0;

      displayList.add({
        'time': weekLabel,
        'usage': '${energy.toStringAsFixed(2)} kWh',
        'percent': percent,
      });
    });

    setState(() {
      _avgPower = sampleCount > 0 ? totalPower / sampleCount : 0;
      _peakPower = maxPower;
      _totalEnergy = totalEnergySum;
      _estimatedCost = totalEnergySum * 209.5;
      _hourlyData = displayList;
      _isLoading = false;
    });
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  String _formatDisplayDate(String dateStr) {
    try {
      final parts = dateStr.split('-');
      final year = parts[0];
      final month = parts[1];
      final day = parts[2];
      return '$day/$month';
    } catch (e) {
      return dateStr;
    }
  }

  String _formatNaira(double amount) {
    return '₦${amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}';
  }

  String _getUsageInsight() {
    if (_timeRange == '24h') {
      if (_totalEnergy < 5) {
        return 'Great job! Your energy usage today is low.';
      } else if (_totalEnergy < 10) {
        return 'Your usage is moderate. Consider reducing peak hour consumption.';
      } else {
        return 'High usage detected. Review appliances running during peak hours.';
      }
    } else if (_timeRange == '7d') {
      final avgDaily = _totalEnergy / 7;
      if (avgDaily < 5) {
        return 'Excellent! Your average daily usage is ${avgDaily.toStringAsFixed(1)} kWh.';
      } else if (avgDaily < 10) {
        return 'Your average daily usage is ${avgDaily.toStringAsFixed(1)} kWh - good management!';
      } else {
        return 'Average daily usage: ${avgDaily.toStringAsFixed(1)} kWh. Consider energy-saving measures.';
      }
    } else {
      final avgDaily = _totalEnergy / 30;
      if (avgDaily < 5) {
        return 'Outstanding! Monthly average: ${avgDaily.toStringAsFixed(1)} kWh per day.';
      } else if (avgDaily < 10) {
        return 'Monthly average: ${avgDaily.toStringAsFixed(1)} kWh per day - well maintained!';
      } else {
        return 'Monthly average: ${avgDaily.toStringAsFixed(1)} kWh per day. Review high-consumption periods.';
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Time Range Selector
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                TimeRangeButton(
                  label: '24 Hours',
                  value: '24h',
                  selected: _timeRange == '24h',
                  onTap: () {
                    setState(() => _timeRange = '24h');
                    _loadHistoryData();
                  },
                ),
                const SizedBox(width: 6),
                TimeRangeButton(
                  label: '7 Days',
                  value: '7d',
                  selected: _timeRange == '7d',
                  onTap: () {
                    setState(() => _timeRange = '7d');
                    _loadHistoryData();
                  },
                ),
                const SizedBox(width: 6),
                TimeRangeButton(
                  label: '30 Days',
                  value: '30d',
                  selected: _timeRange == '30d',
                  onTap: () {
                    setState(() => _timeRange = '30d');
                    _loadHistoryData();
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Loading / Error / Data
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(40.0),
                child: Column(
                  children: [
                    CircularProgressIndicator(
                      color: Color(0xFF84A98C),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Loading history data...',
                      style: TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else if (_errorMessage != null)
            Center(
              child: Container(
                padding: const EdgeInsets.all(20),
                margin: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFE07A5F).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFFE07A5F).withOpacity(0.3),
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      color: Color(0xFFE07A5F),
                      size: 40,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF3D405B),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else ...[
            // Statistics Card
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF84A98C).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.analytics_outlined,
                          size: 20,
                          color: Color(0xFF84A98C),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Statistics',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF3D405B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  StatRow(
                    label: 'Average Power',
                    value: '${_avgPower.toStringAsFixed(1)} W',
                  ),
                  StatRow(
                    label: 'Peak Power',
                    value: '${_peakPower.toStringAsFixed(1)} W',
                  ),
                  StatRow(
                    label: 'Total Energy',
                    value: '${_totalEnergy.toStringAsFixed(2)} kWh',
                  ),
                  StatRow(
                    label: 'Estimated Cost',
                    value: _formatNaira(_estimatedCost),
                    valueColor: const Color(0xFF84A98C),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Usage Insights Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF84A98C).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF84A98C).withOpacity(0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.lightbulb_outline,
                        color: Color(0xFF84A98C),
                        size: 20,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Usage Insight',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF3D405B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _getUsageInsight(),
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF6B7280),
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Usage Breakdown
            if (_hourlyData.isNotEmpty)
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
                    Text(
                      _timeRange == '24h'
                          ? 'Hourly Breakdown'
                          : _timeRange == '7d'
                              ? 'Daily Breakdown'
                              : 'Weekly Breakdown',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF3D405B),
                      ),
                    ),
                    const SizedBox(height: 20),
                    ..._hourlyData.map((period) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    period['time'] as String,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF6B7280),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Text(
                                  period['usage'] as String,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF3D405B),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: _toDouble(period['percent']),
                                backgroundColor: const Color(0xFFF5F5F4),
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                  Color(0xFF84A98C),
                                ),
                                minHeight: 8,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}
