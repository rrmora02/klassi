'use client';

import { Suspense } from 'react';

export function StudentTableSkeleton() {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['Alumno', 'Edad', 'Disciplinas', 'Contacto', 'Estado', ''].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j} style={{ padding: '11px 14px' }}>
                  <div style={{ height: 16, background: 'var(--color-background-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StudentTableProps {
  students: any[];
  StudentRow: React.ComponentType<{ student: any }>;
}

export function StudentTableContent({ students, StudentRow }: StudentTableProps) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['Alumno', 'Edad', 'Disciplinas', 'Contacto', 'Estado', ''].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>No se encontraron alumnos</td></tr>
          )}
          {students.map(s => (
            <StudentRow key={s.id} student={s} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StudentTable({ students, StudentRow }: StudentTableProps) {
  return (
    <Suspense fallback={<StudentTableSkeleton />}>
      <StudentTableContent students={students} StudentRow={StudentRow} />
    </Suspense>
  );
}
