'use client';

import { memo } from 'react';
import Link from 'next/link';
import { fullName, calcAge } from '@/lib/utils';
import { StudentStatusBadge } from './student-status-badge';

interface StudentRowProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    email: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    enrollments: Array<{
      id: string;
      group: {
        discipline: {
          name: string;
        };
      };
    }>;
    parents: Array<{
      id: string;
      isPrimary: boolean;
      relationship: string | null;
      user: {
        name: string;
        phone: string | null;
        email: string | null;
      };
    }>;
  };
}

const StudentRow = memo(function StudentRow({ student: s }: StudentRowProps) {
  return (
    <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <td style={{ padding: '11px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#d4e9e2',
              color: '#006241',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {s.firstName[0]}{s.lastName[0]}
          </div>
          <div>
            <Link
              href={`/dashboard/alumnos/${s.id}`}
              style={{
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
              }}
            >
              {fullName(s.firstName, s.lastName)}
            </Link>
            {s.email && (
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                {s.email}
              </p>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: '11px 14px', color: 'var(--color-text-secondary)' }}>
        {calcAge(s.birthDate) ?? '—'}
      </td>
      <td style={{ padding: '11px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {s.enrollments.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Sin grupo</span>
          )}
          {s.enrollments.map((e) => (
            <span
              key={e.id}
              style={{
                background: '#d4e9e2',
                color: '#006241',
                borderRadius: 20,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {e.group.discipline.name}
            </span>
          ))}
        </div>
      </td>
      <td style={{ padding: '11px 14px', color: 'var(--color-text-secondary)', fontSize: 12 }}>
        <div>
          {s.parents.length === 0 ? (
            <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
          ) : (
            s.parents.map((parent, idx) => (
              <div key={parent.id}>
                <div style={{ fontWeight: parent.isPrimary ? 500 : 400 }}>
                  {parent.user.name}{' '}
                  {parent.relationship && (
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                      ({parent.relationship})
                    </span>
                  )}
                </div>
                {parent.user.phone && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--color-text-tertiary)',
                      marginTop: 2,
                    }}
                  >
                    {parent.user.phone}
                  </div>
                )}
                {!parent.user.phone && parent.user.email && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--color-text-tertiary)',
                      marginTop: 2,
                    }}
                  >
                    {parent.user.email}
                  </div>
                )}
                {idx < s.parents.length - 1 && (
                  <div style={{ marginTop: 6, borderTop: '0.5px solid var(--color-border-tertiary)' }} />
                )}
              </div>
            ))
          )}
        </div>
      </td>
      <td style={{ padding: '11px 14px' }}>
        <StudentStatusBadge status={s.status} />
      </td>
      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
        <Link
          href={`/dashboard/alumnos/${s.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 6,
            border: '0.5px solid var(--color-border-secondary)',
            background: 'transparent',
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Ver →
        </Link>
      </td>
    </tr>
  );
});

export { StudentRow };
