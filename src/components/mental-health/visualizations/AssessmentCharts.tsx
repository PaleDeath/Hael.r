import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from 'recharts';
import { AnalysisResult, MentalHealthCategory } from '../types';

interface SavedAssessment {
  date: string;
  result: AnalysisResult;
  answers: Record<string, number>;
  questionPath: string[];
}

interface AssessmentChartsProps {
  assessments: SavedAssessment[];
}

interface TrendDataPoint {
  date: string;
  [key: string]: string | number; // Index signature for category scores
}

const AssessmentCharts: React.FC<AssessmentChartsProps> = ({ assessments }) => {
  const sorted = useMemo(
    () =>
      [...assessments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [assessments]
  );

  // Transform the data for trend visualization (oldest → newest for lines)
  const trendData = useMemo(() => {
    const chronological = [...sorted].reverse();
    return chronological.map(assessment => {
      const result: TrendDataPoint = {
        date: new Date(assessment.date).toLocaleDateString(),
      };
      
      // Add each category score to the result
      Object.entries(assessment.result.categories).forEach(([category, data]) => {
        result[category] = data.score;
      });
      
      return result;
    });
  }, [sorted]);

  // Get the most recent assessment data for radar chart
  const radarData = useMemo(() => {
    if (sorted.length === 0) return [];
    
    const latestAssessment = sorted[0];
    
    return Object.entries(latestAssessment.result.categories).map(([category, data]) => ({
      subject: category.charAt(0).toUpperCase() + category.slice(1),
      score: data.score,
      fullMark: 10,
    }));
  }, [sorted]);

  // Prepare data for severity distribution chart
  const severityData = useMemo(() => {
    const counts = { low: 0, moderate: 0, high: 0 };
    
    sorted.forEach(assessment => {
      Object.values(assessment.result.categories).forEach(category => {
        counts[category.severity]++;
      });
    });
    
    return Object.entries(counts).map(([severity, count]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      count
    }));
  }, [sorted]);

  // Colors for severity levels
  const SEVERITY_COLORS = {
    Low: '#82ca9d',
    Moderate: '#ffc658',
    High: '#ff8042'
  };

  // Color getter function for consistent colors across charts
  const getCategoryColor = (category: string) => {
    const colorMap: Record<MentalHealthCategory, string> = {
      anxiety: '#8884d8',
      depression: '#82ca9d',
      stress: '#ffc658',
      sleep: '#8dd1e1',
      social: '#a4de6c'
    };
    return colorMap[category as MentalHealthCategory] || '#888888';
  };

  if (sorted.length === 0) {
    return <p className="text-center text-gray-500 my-8">No assessment data available for visualization</p>;
  }

  return (
    <div className="space-y-8 mt-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Mental Health Score Trends</h3>
        <div className="h-72 w-full bg-white rounded-lg shadow p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value: number) => `${Number(value).toFixed(0)}%`} />
              <Legend />
              {Object.keys(sorted[0]?.result.categories || {}).map((category) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={getCategoryColor(category)}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-4">Latest Assessment Profile</h3>
          <div className="h-72 bg-white rounded-lg shadow p-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Radar
                  name="Mental Health Profile"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip formatter={(value: number) => `${Number(value).toFixed(0)}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Severity Distribution</h3>
          <div className="h-72 bg-white rounded-lg shadow p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={severityData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis tickFormatter={(value) => value.toFixed(2)} />
                <Tooltip formatter={(value: number) => value.toFixed(2)} />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Number of Categories"
                  radius={[4, 4, 0, 0]}
                  barSize={60}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentCharts; 