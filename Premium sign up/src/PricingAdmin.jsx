import { useEffect, useState } from 'react';

const path = '/api/platform/pricing';
const dollars = cents => (cents / 100).toFixed(2);
function cents(value) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error('Enter each amount in dollars with up to two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
function draftFor(data) {
  return [
    ...data.plans.map(plan => ({ ...plan, retail: dollars(plan.priceCents), cost: dollars(plan.supplierMonthlyCents) })),
    { id: 'organization-user', name: 'Organization Basic user', retail: dollars(data.organizationUserCents), cost: dollars(data.organizationUserSupplierCents) },
  ];
}

export default function PricingAdmin({ request, onBack }) {
  const [revision, setRevision] = useState(null);
  const [rows, setRows] = useState([]);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    request(path).then(data => {
      if (active) {
        setRevision(data.revision);
        setRows(draftFor(data));
      }
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [request, reload]);

  function change(id, field, value) {
    setNotice('');
    setRows(previous => previous.map(row => row.id === id ? { ...row, [field]: value } : row));
  }

  async function save(event) {
    event.preventDefault();
    if (busy || revision === null) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const amounts = rows.map(({ id, retail, cost }) =>
        ({ id, priceCents: cents(retail), supplierMonthlyCents: cents(cost) }));
      const organizationUser = amounts.pop();
      const data = await request(path, { method: 'PUT', body: JSON.stringify({
        revision,
        plans: amounts,
        organizationUserCents: organizationUser.priceCents,
        organizationUserSupplierCents: organizationUser.supplierMonthlyCents,
      }) });
      setRevision(data.revision);
      setRows(draftFor(data));
      setNotice('Pricing saved. New visitors will see the updated catalog prices.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <button type="button" className="rc-button" disabled={busy} onClick={onBack}>Back to administration</button>
    <h3>Subscription Plans &amp; Pricing</h3>
    <p>Amounts are monthly, in US dollars. Saving updates the prices shown on the website.</p>
    {error && <p className="ac-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {revision === null && !error && <p role="status">Loading prices…</p>}
    {revision !== null && <form onSubmit={save}>
      <div className="ac-table" role="region" aria-label="Monthly pricing" tabIndex={0}>
        <table className="app-data-table">
          <thead><tr><th scope="col">Plan</th><th scope="col">Retail price</th><th scope="col">Supplier cost</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <th scope="row">{row.name}</th>
            {['retail', 'cost'].map(field => <td key={field}>
              <input aria-label={row.name + (field === 'retail' ? ' retail price' : ' supplier cost')}
                inputMode="decimal" value={row[field]} required maxLength={11} disabled={busy}
                onChange={event => change(row.id, field, event.target.value)} />
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <button className="mc-action" disabled={busy}>{busy ? 'Saving…' : 'Save pricing'}</button>
    </form>}
    <button type="button" className="rc-button" disabled={busy} onClick={() => {
      setRevision(null); setRows([]); setNotice(''); setError(''); setReload(n => n + 1);
    }}>Reload saved prices</button>
  </section>;
}
