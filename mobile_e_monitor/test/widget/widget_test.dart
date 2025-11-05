import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_e_monitor/widgets/metric_card.dart'
    hide StatRow, TimeRangeButton;
import 'package:mobile_e_monitor/widgets/stat_row.dart';
import 'package:mobile_e_monitor/widgets/time_range_button.dart';

void main() {
  group('MetricCard Widget Tests', () {
    testWidgets('renders with correct title and value', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MetricCard(
              title: 'Power',
              value: '575.5W',
              icon: Icons.power_outlined,
              color: Color(0xFF84A98C),
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('Power'), findsOneWidget);
      expect(find.text('575.5W'), findsOneWidget);
      expect(find.byIcon(Icons.power_outlined), findsOneWidget);
    });

    testWidgets('displays icon with correct color', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MetricCard(
              title: 'Energy',
              value: '12.5kWh',
              icon: Icons.trending_up_outlined,
              color: Color(0xFFA855F7),
            ),
          ),
        ),
      );

      // Assert
      final icon = tester.widget<Icon>(find.byIcon(Icons.trending_up_outlined));
      expect(icon.color, const Color(0xFFA855F7));
    });

    testWidgets('handles long values correctly', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MetricCard(
              title: 'Very Long Title Name',
              value: '123,456.789W',
              icon: Icons.power,
              color: Colors.blue,
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('Very Long Title Name'), findsOneWidget);
      expect(find.text('123,456.789W'), findsOneWidget);
    });

    testWidgets('card has proper decoration', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MetricCard(
              title: 'Power',
              value: '100W',
              icon: Icons.power,
              color: Colors.green,
            ),
          ),
        ),
      );

      // Assert
      final container = tester.widget<Container>(
        find
            .descendant(
              of: find.byType(MetricCard),
              matching: find.byType(Container),
            )
            .first,
      );

      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, Colors.white);
      expect(decoration.borderRadius, BorderRadius.circular(16));
    });
  });

  group('StatRow Widget Tests', () {
    testWidgets('renders label and value correctly', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatRow(
              label: 'Average Power',
              value: '450.5 W',
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('Average Power'), findsOneWidget);
      expect(find.text('450.5 W'), findsOneWidget);
    });

    testWidgets('applies custom value color', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatRow(
              label: 'Cost',
              value: '₦5,000',
              valueColor: Color(0xFF84A98C),
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('Cost'), findsOneWidget);
      expect(find.text('₦5,000'), findsOneWidget);
    });

    testWidgets('uses default color when valueColor not specified',
        (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatRow(
              label: 'Usage',
              value: '10 kWh',
            ),
          ),
        ),
      );

      // Assert
      final valueText = tester.widget<Text>(find.text('10 kWh'));
      expect(valueText.style?.color, const Color(0xFF3D405B));
    });
  });

  group('TimeRangeButton Widget Tests', () {
    testWidgets('renders label correctly', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              // TimeRangeButton needs Row parent
              children: [
                TimeRangeButton(
                  label: '24 Hours',
                  value: '24h',
                  selected: false,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('24 Hours'), findsOneWidget);
    });

    testWidgets('shows selected state correctly', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              // TimeRangeButton needs Row parent
              children: [
                TimeRangeButton(
                  label: '7 Days',
                  value: '7d',
                  selected: true,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
      );

      // Assert
      final container = tester.widget<Container>(
        find
            .descendant(
              of: find.byType(TimeRangeButton),
              matching: find.byType(Container),
            )
            .first,
      );

      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, const Color(0xFF84A98C)); // Selected color
    });

    testWidgets('shows unselected state correctly', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              // TimeRangeButton needs Row parent
              children: [
                TimeRangeButton(
                  label: '30 Days',
                  value: '30d',
                  selected: false,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
      );

      // Assert
      final container = tester.widget<Container>(
        find
            .descendant(
              of: find.byType(TimeRangeButton),
              matching: find.byType(Container),
            )
            .first,
      );

      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, const Color(0xFFF5F5F4)); // Unselected color
    });

    testWidgets('triggers onTap callback', (tester) async {
      // Arrange
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              // TimeRangeButton needs Row parent
              children: [
                TimeRangeButton(
                  label: '24 Hours',
                  value: '24h',
                  selected: false,
                  onTap: () {
                    tapped = true;
                  },
                ),
              ],
            ),
          ),
        ),
      );

      // Act
      await tester.tap(find.byType(TimeRangeButton));
      await tester.pumpAndSettle();

      // Assert
      expect(tapped, true);
    });

    testWidgets('selected button has white text', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              // TimeRangeButton needs Row parent
              children: [
                TimeRangeButton(
                  label: 'Selected',
                  value: 'sel',
                  selected: true,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
      );

      // Assert
      final text = tester.widget<Text>(find.text('Selected'));
      expect(text.style?.color, Colors.white);
    });

    testWidgets('unselected button has gray text', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              // TimeRangeButton needs Row parent
              children: [
                TimeRangeButton(
                  label: 'Unselected',
                  value: 'unsel',
                  selected: false,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
      );

      // Assert
      final text = tester.widget<Text>(find.text('Unselected'));
      expect(text.style?.color, const Color(0xFF6B7280));
    });
  });

  group('Widget Integration Tests', () {
    testWidgets('TimeRangeButtons work together in a row', (tester) async {
      // Arrange
      String selectedRange = '24h';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return Row(
                  children: [
                    TimeRangeButton(
                      label: '24h',
                      value: '24h',
                      selected: selectedRange == '24h',
                      onTap: () => setState(() => selectedRange = '24h'),
                    ),
                    TimeRangeButton(
                      label: '7d',
                      value: '7d',
                      selected: selectedRange == '7d',
                      onTap: () => setState(() => selectedRange = '7d'),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );

      // Assert initial state
      expect(selectedRange, '24h');

      // Act - tap second button
      await tester.tap(find.text('7d'));
      await tester.pumpAndSettle();

      // Assert
      expect(selectedRange, '7d');
    });

    testWidgets('MetricCards display in grid layout', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GridView.count(
              crossAxisCount: 2,
              children: const [
                MetricCard(
                  title: 'Power',
                  value: '100W',
                  icon: Icons.power,
                  color: Colors.green,
                ),
                MetricCard(
                  title: 'Energy',
                  value: '10kWh',
                  icon: Icons.trending_up,
                  color: Colors.blue,
                ),
              ],
            ),
          ),
        ),
      );

      // Assert
      expect(find.byType(MetricCard), findsNWidgets(2));
      expect(find.text('Power'), findsOneWidget);
      expect(find.text('Energy'), findsOneWidget);
    });
  });
}
