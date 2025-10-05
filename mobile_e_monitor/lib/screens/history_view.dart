// ignore_for_file: unnecessary_to_list_in_spreads

import 'package:flutter/material.dart';
import '../widgets/time_range_button.dart';
import '../widgets/stat_row.dart';

class HistoryView extends StatefulWidget {
  final String unitId;

  const HistoryView({super.key, required this.unitId});

  @override
  State<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends State<HistoryView> {
  String _timeRange = '24h';

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
                  onTap: () => setState(() => _timeRange = '24h'),
                ),
                const SizedBox(width: 6),
                TimeRangeButton(
                  label: '7 Days',
                  value: '7d',
                  selected: _timeRange == '7d',
                  onTap: () => setState(() => _timeRange = '7d'),
                ),
                const SizedBox(width: 6),
                TimeRangeButton(
                  label: '30 Days',
                  value: '30d',
                  selected: _timeRange == '30d',
                  onTap: () => setState(() => _timeRange = '30d'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          const SizedBox(height: 24),
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
                const StatRow(label: 'Average Power', value: '345.2 W'),
                const StatRow(label: 'Peak Power', value: '678.9 W'),
                const StatRow(label: 'Total Energy', value: '24.3 kWh'),
                const StatRow(
                  label: 'Estimated Cost',
                  value: 'RWF 3,645',
                  valueColor: Color(0xFF84A98C),
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
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
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
                SizedBox(height: 12),
                Text(
                  'Your usage is 12% lower than last week. Keep up the good work!',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Hourly Breakdown
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
                  'Hourly Breakdown',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF3D405B),
                  ),
                ),
                const SizedBox(height: 20),
                ...[
                  {'time': '00:00 - 06:00', 'usage': '2.3 kWh', 'percent': 0.3},
                  {'time': '06:00 - 12:00', 'usage': '5.8 kWh', 'percent': 0.7},
                  {'time': '12:00 - 18:00', 'usage': '8.9 kWh', 'percent': 1.0},
                  {
                    'time': '18:00 - 24:00',
                    'usage': '7.3 kWh',
                    'percent': 0.85
                  },
                ].map((period) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              period['time'] as String,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF6B7280),
                                fontWeight: FontWeight.w500,
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
                            value: period['percent'] as double,
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
      ),
    );
  }
}
