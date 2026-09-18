import React from 'react';
import { ProductSpec } from '../../types/product';

interface TechnicalSpecsTableProps {
  specs: ProductSpec[];
}

export const TechnicalSpecsTable: React.FC<TechnicalSpecsTableProps> = ({ specs }) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}
    >
      <table className="specs-table">
        <tbody>
          {specs.map((item, idx) => (
            <tr key={idx}>
              <td className="spec-name">{item.name}</td>
              <td className="spec-val">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
