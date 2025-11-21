import 'package:flutter/material.dart';
import '../models/tenant_unit.dart';
import 'dashboard_view.dart';
import 'history_view.dart';
import 'login_screen.dart';

class HomePage extends StatefulWidget {
  final String? authenticatedUnitId;
  final String? buildingId;
  final String? buildingName;
  final String? accessCode;

  const HomePage({
    super.key,
    this.authenticatedUnitId,
    this.buildingId,
    this.buildingName,
    this.accessCode,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;
  late String _selectedUnit;
  late List<TenantUnit> units;
  late bool _isAuthenticated;

  @override
  void initState() {
    super.initState();

    // Check if user is authenticated via login
    _isAuthenticated = widget.authenticatedUnitId != null;

    if (_isAuthenticated) {
      // User logged in with access code - show only their unit
      _selectedUnit = widget.authenticatedUnitId!;
      units = [
        TenantUnit(
          id: widget.authenticatedUnitId!,
          name: _getUnitDisplayName(widget.authenticatedUnitId!),
          percentage: 100.0,
        ),
      ];
    } else {
      _selectedUnit = 'unit_001';
      units = [
        TenantUnit(id: 'unit_001', name: 'House A', percentage: 35.0),
        TenantUnit(id: 'unit_002', name: 'House B', percentage: 28.0),
        TenantUnit(id: 'unit_003', name: 'House C', percentage: 37.0),
      ];
    }
  }

  String _getUnitDisplayName(String unitId) {
    // Convert unit_001 to House A, unit_002 to House B, etc.
    final unitNumber = unitId.replaceAll('unit_', '');
    switch (unitNumber) {
      case '001':
        return 'House A';
      case '002':
        return 'House B';
      case '003':
        return 'House C';
      default:
        return 'House ${unitNumber.replaceFirst(RegExp(r'^0+'), '')}';
    }
  }

  void _logout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
                (route) => false,
              );
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Energy Monitor'),
            if (_isAuthenticated && widget.buildingName != null)
              Text(
                widget.buildingName!,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                  color: Color(0xFF6B7280),
                ),
              ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF84A98C).withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF84A98C),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'Live',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),

          // Show logout button only for authenticated users
          if (_isAuthenticated)
            IconButton(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              tooltip: 'Logout',
            ),
        ],
      ),
      body: Column(
        children: [
          // Unit Selector Card - Only show if not authenticated or multiple units
          if (!_isAuthenticated || units.length > 1)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: _isAuthenticated && units.length == 1
                  ? // Show current unit info for authenticated single unit
                  Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.home_outlined,
                              size: 20,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  units.first.name,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (widget.accessCode != null)
                                  Text(
                                    'Access Code: ${widget.accessCode}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )
                  : // Show dropdown for multiple units (demo mode)
                  DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedUnit,
                        isExpanded: true,
                        borderRadius: BorderRadius.circular(12),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        icon: Icon(
                          Icons.keyboard_arrow_down_rounded,
                          color: theme.colorScheme.onSurface,
                        ),
                        style: TextStyle(
                          color: theme.colorScheme.onSurface,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        items: units.map((unit) {
                          return DropdownMenuItem(
                            value: unit.id,
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.primary
                                        .withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    Icons.home_outlined,
                                    size: 20,
                                    color: theme.colorScheme.primary,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(unit.name),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (!_isAuthenticated) {
                            setState(() {
                              _selectedUnit = value!;
                            });
                          }
                        },
                      ),
                    ),
            ),

          // Content - Your existing views
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                DashboardView(
                  unitId: _selectedUnit,
                  buildingId:
                      widget.buildingId ?? 'building_001', // Default fallback
                ),
                HistoryView(
                  unitId: _selectedUnit,
                  buildingId:
                      widget.buildingId ?? 'building_001', // Default fallback
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: Color(0xFFE5E7EB), width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) {
            setState(() {
              _selectedIndex = index;
            });
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Dashboard',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history_outlined),
              activeIcon: Icon(Icons.history),
              label: 'History',
            ),
          ],
        ),
      ),
    );
  }
}
