import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GenerativeChart = ({ title, data }) => {
  return (
    <div className="generative-chart-container" style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '12px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#e0e0e0', textAlign: 'center' }}>{title}</h4>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="#a0a0a0" fontSize={12} />
            <YAxis stroke="#a0a0a0" fontSize={12} />
            <Tooltip 
              contentStyle={{ background: '#1e1e2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GenerativeChart;
