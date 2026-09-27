'use client';

const CWE_MAP = [
  { cweId: 'CWE-89', name: 'SQL Injection' },
  { cweId: 'CWE-79', name: 'Reflected Cross-Site Scripting (XSS)' },
  { cweId: 'CWE-200', name: 'Information Disclosure / Exposure' },
  { cweId: 'CWE-256', name: 'Plaintext Password Storage / Exposure' },
  { cweId: 'CWE-916', name: 'Weak / Disclosed Password Hash' },
  { cweId: 'CWE-312', name: 'Cleartext Secrets / Private Key Exposure' },
  { cweId: 'CWE-798', name: 'Hardcoded Cloud Credentials (AWS Key)' },
  { cweId: 'CWE-639', name: 'Broken Object Level Authorization (IDOR/BOLA)' },
  { cweId: 'CWE-693', name: 'Protection Mechanism Failure (CSP Missing)' },
  { cweId: 'CWE-319', name: 'Cleartext Transmission (HSTS Missing)' },
  { cweId: 'CWE-942', name: 'Permissive CORS Policy / Reflection' },
  { cweId: 'CWE-1004', name: 'Sensitive Cookie Missing HttpOnly Flag' },
  { cweId: 'CWE-614', name: 'Sensitive Cookie Missing Secure Flag' },
  { cweId: 'CWE-1275', name: 'Sensitive Cookie Missing SameSite Attribute' },
];

export default function CategoryDistribution({ findings = [] }) {
  const total = Math.max(1, findings.length);
  const distribution = CWE_MAP.map((item) => {
    const count = findings.filter((f) => f.cweId === item.cweId).length;
    const percentage = Math.round((count / total) * 100);
    return { ...item, count, percentage };
  }).filter((item) => item.count > 0);

  if (distribution.length === 0) {
    return (
      <div className="bg-canvas-raised border border-border rounded-lg p-5 flex items-center justify-center min-h-[120px]">
        <span className="text-xs text-ink-faint">No CWE-classified findings in this scan</span>
      </div>
    );
  }

  return (
    <div className="bg-canvas-raised border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h3 className="text-sm font-medium text-ink">CWE Distribution</h3>
      </div>
      <div className="flex flex-col gap-2.5">
        {distribution.map((item) => (
          <div key={item.cweId} className="p-2.5 bg-canvas-overlay border border-border rounded flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-ink-muted">
                  {item.cweId}
                </span>
                <span className="text-ink font-medium">{item.name}</span>
              </div>
              <span className="text-ink-muted">
                {item.count} ({item.percentage}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${Math.max(3, item.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
