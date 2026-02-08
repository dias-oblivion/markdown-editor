import { useState, useCallback } from 'react';
import type { TableConfig } from '../../types';
import styles from './Toolbar.module.css';

interface TableDialogProps {
  onInsert: (config: TableConfig) => void;
  onCancel: () => void;
}

export function TableDialog({ onInsert, onCancel }: TableDialogProps) {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  const [headers, setHeaders] = useState<string[]>(() => Array(3).fill('').map((_, i) => `Header ${i + 1}`));
  const [data, setData] = useState<string[][]>(() =>
    Array(3).fill(null).map(() => Array(3).fill(''))
  );

  const addColumn = useCallback(() => {
    setCols(c => c + 1);
    setHeaders(h => [...h, `Header ${h.length + 1}`]);
    setData(d => d.map(row => [...row, '']));
  }, []);

  const removeColumn = useCallback(() => {
    if (cols <= 1) return;
    setCols(c => c - 1);
    setHeaders(h => h.slice(0, -1));
    setData(d => d.map(row => row.slice(0, -1)));
  }, [cols]);

  const addRow = useCallback(() => {
    setRows(r => r + 1);
    setData(d => [...d, Array(cols).fill('')]);
  }, [cols]);

  const removeRow = useCallback(() => {
    if (rows <= 1) return;
    setRows(r => r - 1);
    setData(d => d.slice(0, -1));
  }, [rows]);

  function updateHeader(colIdx: number, value: string) {
    setHeaders(h => h.map((v, i) => i === colIdx ? value : v));
  }

  function updateCell(rowIdx: number, colIdx: number, value: string) {
    setData(d => d.map((row, ri) =>
      ri === rowIdx ? row.map((cell, ci) => ci === colIdx ? value : cell) : row
    ));
  }

  function handleInsert() {
    onInsert({ rows, cols, headers, data });
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()} style={{ minWidth: 500 }}>
        <div className={styles.tableControls}>
          <div className={styles.dialogTitle} style={{ margin: 0 }}>Table Editor</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className={styles.tableControlGroup}>
              <button className={styles.tableControlButton} onClick={addColumn} title="Add column">+</button>
              <button className={styles.tableControlButton} onClick={removeColumn} title="Remove column">−</button>
            </div>
            <div className={styles.tableControlSep} />
            <div className={styles.tableControlGroup}>
              <button className={styles.tableControlButton} onClick={addRow} title="Add row">+</button>
              <button className={styles.tableControlButton} onClick={removeRow} title="Remove row">−</button>
            </div>
          </div>
        </div>

        <div className={styles.tableEditor}>
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>
                    <input
                      className={styles.tableEditorInput}
                      value={h}
                      onChange={e => updateHeader(i, e.target.value)}
                      style={{ fontWeight: 600 }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>
                      <input
                        className={styles.tableEditorInput}
                        value={cell}
                        onChange={e => updateCell(ri, ci, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span className={styles.tableSize}>{cols} × {rows + 1}</span>
          <div className={styles.dialogActions} style={{ margin: 0 }}>
            <button className={`${styles.dialogButton} ${styles.dialogButtonCancel}`} onClick={onCancel}>
              Cancel
            </button>
            <button className={`${styles.dialogButton} ${styles.dialogButtonPrimary}`} onClick={handleInsert}>
              Insert Table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
