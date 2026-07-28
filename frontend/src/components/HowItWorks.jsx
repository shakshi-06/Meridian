import './HowItWorks.css';

const STEPS = [
  {
    n: '01',
    title: 'A provider stakes and registers',
    body: 'A node operator locks XLM collateral into NodeRegistry along with country, price per hour, and a hashed endpoint. The stake is slashable collateral, not a deposit — it is what makes reputation mean something.',
  },
  {
    n: '02',
    title: 'You rent a node by the hour',
    body: 'SessionManager reads the live price straight from NodeRegistry, escrows your payment, and opens a session. No party other than the two contracts touches your funds in between.',
  },
  {
    n: '03',
    title: 'The session settles on-chain',
    body: 'When you end the session, escrowed XLM releases to the provider and your rating writes back into NodeRegistry — the two contracts calling each other directly, not through an off-chain backend.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how">
      <div className="container">
        <span className="eyebrow">Protocol flow</span>
        <h2 className="how-title">Two contracts, one accountable loop</h2>
        <div className="how-grid">
          {STEPS.map((step) => (
            <div className="how-step" key={step.n}>
              <span className="how-step-n mono">{step.n}</span>
              <h3 className="how-step-title">{step.title}</h3>
              <p className="how-step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
