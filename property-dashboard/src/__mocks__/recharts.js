const React = require('react');

module.exports = {
  ResponsiveContainer: ({ children }) => React.createElement('div', null, children),
  BarChart: ({ children }) => React.createElement('div', null, children),
  PieChart: ({ children }) => React.createElement('div', null, children),
  Bar: () => null,
  Pie: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
};