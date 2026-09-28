import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Bot, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, ExternalLink,
  Copy, Landmark, Leaf, LockKeyhole, Menu, Network, Rocket, Shield, Sparkles, Users, WalletCards, X,
} from 'lucide-react'
import { composePlan, getMetrics, publishReceipt } from './api'
import { PrivacyBoundary } from './components/PrivacyBoundary'
import { ProofProgress } from './components/ProofProgress'
import type { Category, ContractDeployment, DisclosurePlan, Network as MidnightNetwork, PublicMetrics, PublicReceipt } from './types'
import { LocalCredentialStore } from './privacy/localState'
import { DeploymentStore } from './privacy/deploymentStore'
import { useWallet } from './wallet/useWallet'
import { ContractNotConfiguredError, submitResponseCircuit, type ProofPhase } from './midnight/runtime'

const categories: Array<{ id: Category; label: string; copy: string }> = [
  { id: 'support', label: 'Support', copy: 'The proposed evening access feels right.' },
  { id: 'unsure', label: 'Unsure', copy: 'I need more detail before deciding.' },
  { id: 'concern', label: 'Concern', copy: 'The proposal needs meaningful changes.' },
]

const steps = ['Understand', 'Private data', 'Review', 'Connect', 'Deploy', 'Prove', 'Receipt']

function App() {
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<Category>('support')
  const [network, setNetwork] = useState<MidnightNetwork>('preview')
  const [age, setAge] = useState('34')
  const [district, setDistrict] = useState('North Harbor')
  const [note, setNote] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [plan, setPlan] = useState<DisclosurePlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [proofPhase, setProofPhase] = useState<ProofPhase>(0)
  const [proofBusy, setProofBusy] = useState(false)
  const [proofError, setProofError] = useState('')
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null)
  const [deployment, setDeployment] = useState<ContractDeployment | null>(null)
  const [deployBusy, setDeployBusy] = useState(false)
  const [deployError, setDeployError] = useState('')
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null)
  const wallet = useWallet(network)
  const credentialStore = useMemo(() => new LocalCredentialStore(), [])
  const deploymentStore = useMemo(() => new DeploymentStore(), [])

  const selected = useMemo(() => categories.find((item) => item.id === category)!, [category])
  const next = () => setStep((value) => Math.min(value + 1, steps.length - 1))

  useEffect(() => {
    setDeployment(wallet.walletId ? deploymentStore.load(network, wallet.walletId) : null)
  }, [deploymentStore, network, wallet.walletId])

  useEffect(() => {
    getMetrics()
      .then((items) => setMetrics(items.find((item) => item.campaign_public_id === 'harbor-park-2026') ?? null))
      .catch(() => setMetrics(null))
  }, [])

  async function askGemini() {
    setPlanLoading(true)
    setPlanError('')
    try { setPlan(await composePlan()) } catch { setPlanError('The assistant is unavailable. The proof can still continue.') }
    finally { setPlanLoading(false) }
  }

  async function prove() {
    const privateState = credentialStore.load()
    if (!privateState || !wallet.api || !wallet.configuration || !deployment) {
      setProofError('A local credential, connected wallet, and retained contract deployment are required.')
      return
    }
    setProofBusy(true)
    setProofError('')
    try {
      const finalized = await submitResponseCircuit({ category, network, walletApi: wallet.api, walletConfiguration: wallet.configuration, privateState, contractAddress: deployment.contract_address, onPhase: setProofPhase })
      setReceipt(finalized)
      try { await publishReceipt(finalized) } catch { /* On-chain truth remains valid if the public API is temporarily unavailable. */ }
      next()
    } catch (error) {
      setProofError(error instanceof ContractNotConfiguredError ? error.message : error instanceof Error ? error.message : 'Proof submission failed.')
    } finally { setProofBusy(false) }
  }

  async function deployContract() {
    const privateState = credentialStore.load()
    if (!privateState || !wallet.api || !wallet.configuration || !wallet.walletId) {
      setDeployError('Save your local credential and connect 1AM before deploying.')
      return
    }
    setDeployBusy(true)
    setDeployError('')
    try {
      const { deployLumenCommons } = await import('./midnight/contractBinding')
      const finalized = await deployLumenCommons({
        network,
        walletProviderId: wallet.walletId,
        walletApi: wallet.api,
        walletConfiguration: wallet.configuration,
        privateState,
      })
      deploymentStore.save(finalized)
      setDeployment(finalized)
      next()
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : 'Contract deployment failed.')
    } finally {
      setDeployBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Lumen Commons home">
          <span className="brand-mark"><Landmark size={20} /></span>
          <span><strong>Lumen</strong> Commons</span>
        </a>
        <nav className={menuOpen ? 'nav-open' : ''} aria-label="Primary navigation">
          <a href="#consultation">Consultation</a><a href="#privacy">Privacy</a><a href="#public-record">Public record</a>
        </nav>
        <div className="top-actions">
          <span className="network-chip"><i /> Midnight {network === 'preview' ? 'Preview' : 'Preprod'}</span>
          <button className="icon-button mobile-only" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero" id="consultation">
          <div className="hero-copy">
            <span className="eyebrow"><Leaf size={14} /> North Harbor public consultation · closes 18 Oct</span>
            <h1>Have your say.<br /><em>Keep your identity.</em></h1>
            <p className="lead">Prove you are eligible to respond without revealing who you are, where you live, or how old you are.</p>
            <div className="hero-meta">
              <span><Users size={17} /><strong>{metrics?.finalized_proofs ?? 0}</strong> verified responses</span>
              <span><Clock3 size={17} /><strong>3 min</strong> average</span>
              <span><Shield size={17} /><strong>0</strong> identities collected</span>
            </div>
          </div>

          <motion.aside className="consultation-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-topline"><span>PUBLIC REQUIREMENT</span><span className="status-pill"><i /> Open</span></div>
            <p className="question">Should Harbor Park remain open until 22:00 during summer months?</p>
            <div className="requirement"><CheckCircle2 size={20} /><span><strong>Who can respond</strong>North Harbor residents aged 16 or older</span></div>
            <div className="category-list" role="radiogroup" aria-label="Response category">
              {categories.map((item) => (
                <button className={category === item.id ? 'category selected' : 'category'} role="radio" aria-checked={category === item.id} key={item.id} onClick={() => setCategory(item.id)}>
                  <span className="radio-dot">{category === item.id && <i />}</span><span><strong>{item.label}</strong><small>{item.copy}</small></span>
                </button>
              ))}
            </div>
            <button className="primary-button" onClick={next}>Begin private response <ArrowRight size={18} /></button>
            <p className="microcopy"><LockKeyhole size={13} /> Your selected category is public. Your identity is not.</p>
          </motion.aside>
        </section>

        <section className="workflow" aria-labelledby="workflow-title">
          <div className="workflow-head">
            <div><span className="eyebrow">Guided response</span><h2 id="workflow-title">Clear at every step</h2></div>
            <span className="step-count">Step {step + 1} of {steps.length}</span>
          </div>
          <div className="stepper" aria-label="Response progress">
            {steps.map((label, index) => <div className={index <= step ? 'step active' : 'step'} key={label}><span>{index < step ? <Check size={14} /> : index + 1}</span><small>{label}</small></div>)}
          </div>
          <div className="workflow-panel">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
                {step === 0 && <Understand onNext={next} />}
                {step === 1 && <PrivateData age={age} district={district} note={note} setAge={setAge} setDistrict={setDistrict} setNote={setNote} onNext={() => { credentialStore.save({ age: Number(age), district, privateNote: note }); next() }} />}
                {step === 2 && <Review category={selected.label} onNext={next} />}
                {step === 3 && <Connect network={network} setNetwork={setNetwork} wallet={wallet} onNext={next} />}
                {step === 4 && <Deploy deployment={deployment} busy={deployBusy} error={deployError} onDeploy={deployContract} onContinue={next} />}
                {step === 5 && <Prove progress={proofPhase} busy={proofBusy} error={proofError} onProve={prove} />}
                {step === 6 && <Receipt category={selected.label} network={network} receipt={receipt} deployment={deployment} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <div id="privacy"><PrivacyBoundary /></div>

        <section className="assistant-section">
          <div className="assistant-intro">
            <span className="eyebrow"><Sparkles size={14} /> Public-policy assistant</span>
            <h2>Ask what the proof means—not for your private data.</h2>
            <p>Gemini receives only the published requirement and approved response labels. It cannot access your credential, wallet address, private note, or proof witness.</p>
            <button className="secondary-button" onClick={askGemini} disabled={planLoading}>{planLoading ? 'Composing safe explanation…' : 'Explain this proof'} <Bot size={18} /></button>
            {planError && <p className="error-text">{planError}</p>}
          </div>
          <div className="assistant-card" aria-live="polite">
            <div className="assistant-avatar"><Bot /></div>
            {plan ? <><span className="safe-label"><Shield size={13} /> Privacy filter active</span><h3>{plan.plain_language_requirement}</h3><ol>{plan.proof_steps.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ol><small>{plan.used_fallback ? 'Deterministic local explanation' : 'Gemini structured response'} · request {plan.requirement_hash.slice(0, 10)}</small></> : <><span className="safe-label"><Shield size={13} /> No private context</span><h3>A safe explanation will appear here.</h3><p>It will describe the public policy, proof steps, and disclosure boundary in plain language.</p></>}
          </div>
        </section>

        <section className="public-record" id="public-record">
          <div><span className="eyebrow">Public record</span><h2>Community signal, without a people list.</h2></div>
            <Metrics metrics={metrics} />
        </section>
      </main>

      <footer><div className="brand"><span className="brand-mark"><Landmark size={18} /></span><span><strong>Lumen</strong> Commons</span></div><p>Privacy-preserving civic infrastructure, built on Midnight.</p><a href="https://docs.midnight.network" target="_blank" rel="noreferrer">How proofs work <ExternalLink size={14} /></a></footer>

      <div className="mobile-dock"><button onClick={() => document.querySelector('#consultation')?.scrollIntoView()}><Landmark />Consult</button><button onClick={() => document.querySelector('#privacy')?.scrollIntoView()}><Shield />Privacy</button><button onClick={() => document.querySelector('#public-record')?.scrollIntoView()}><Users />Record</button></div>
    </div>
  )
}

function Understand({ onNext }: { onNext: () => void }) {
  return <div className="panel-grid"><div><span className="panel-number">01</span><h3>Understand the rule</h3><p>Midnight checks a private resident credential against two public facts: district and minimum age. The proof says only “eligible” or “not eligible.”</p><button className="primary-button" onClick={onNext}>I understand <ChevronRight size={18} /></button></div><aside className="fact-card"><CircleHelp /><strong>Zero-knowledge, simply</strong><p>Like proving you hold the right key without showing the key—or anything else in your pocket.</p></aside></div>
}

function PrivateData(props: { age: string; district: string; note: string; setAge: (v: string) => void; setDistrict: (v: string) => void; setNote: (v: string) => void; onNext: () => void }) {
  return <div><div className="panel-heading"><div><span className="panel-number">02</span><h3>Load private details</h3></div><span className="local-pill"><LockKeyhole size={13} /> This device only</span></div><div className="form-grid"><label>Credential district<input value={props.district} onChange={(e) => props.setDistrict(e.target.value)} /></label><label>Age from credential<input type="number" value={props.age} onChange={(e) => props.setAge(e.target.value)} /></label><label className="full">Private note <span>optional · never submitted</span><textarea value={props.note} onChange={(e) => props.setNote(e.target.value)} placeholder="Keep a thought for yourself…" /></label></div><div className="panel-actions"><button className="primary-button" onClick={props.onNext}>Save locally and review <ArrowRight size={17} /></button></div></div>
}

function Review({ category, onNext }: { category: string; onNext: () => void }) {
  return <div><span className="panel-number">03</span><h3>Review the boundary</h3><div className="review-grid"><div><span className="review-label private"><LockKeyhole size={14} /> Remains private</span><ul><li>North Harbor credential</li><li>Age value</li><li>Identity and wallet address</li><li>Your private note</li></ul></div><div><span className="review-label public"><Network size={14} /> Will be public</span><ul><li>Campaign: Harbor Park 2026</li><li>Eligibility satisfied</li><li>Category: {category}</li><li>One-response nullifier</li></ul></div></div><div className="panel-actions"><button className="primary-button" onClick={onNext}>Accept disclosure <ArrowRight size={17} /></button></div></div>
}

function Connect({ network, setNetwork, wallet, onNext }: { network: MidnightNetwork; setNetwork: (v: MidnightNetwork) => void; wallet: ReturnType<typeof useWallet>; onNext: () => void }) {
  const oneAm = wallet.wallets[0]
  async function handleConnect() { if (await wallet.connect(oneAm)) onNext() }
  const errorCopy = wallet.error ? ({ rejected: 'Connection was rejected in the wallet.', 'insufficient-dust': 'The wallet needs DUST before proving.', 'proving-service': 'The configured proving service is unavailable.', indexer: 'The wallet indexer is unavailable.', network: 'The wallet is connected to a different network.', unknown: 'No compatible Midnight wallet was found.' }[wallet.error]) : ''
  return <div className="panel-grid"><div><span className="panel-number">04</span><h3>Connect 1AM</h3><p>This app connects exclusively to the 1AM DApp Connector v4 and follows its indexer and proving settings.</p><div className="network-toggle" aria-label="Network"><button className={network === 'preview' ? 'active' : ''} onClick={() => setNetwork('preview')}>Preview</button><button className={network === 'preprod' ? 'active' : ''} onClick={() => setNetwork('preprod')}>Preprod</button></div>{oneAm ? <button className="primary-button" onClick={handleConnect} disabled={wallet.connecting}><WalletCards size={18} /> {wallet.connecting ? 'Waiting for 1AM…' : 'Connect 1AM'}</button> : <a className="primary-button" href="https://1am.xyz/" target="_blank" rel="noreferrer"><WalletCards size={18} /> Get 1AM wallet</a>}{errorCopy && <p className="error-inline">{errorCopy}</p>}</div><aside className="wallet-card"><div className="wallet-symbol">1A</div><div><strong>1AM Wallet</strong><span>{wallet.api ? `Connected · ${wallet.dust?.toString() ?? '0'} DUST` : oneAm ? '1AM is installed and ready' : '1AM extension not detected'}</span></div>{wallet.api ? <button className="text-button" onClick={wallet.disconnect}>Disconnect</button> : <ChevronRight />}</aside></div>
}

function Deploy({ deployment, busy, error, onDeploy, onContinue }: {
  deployment: ContractDeployment | null
  busy: boolean
  error: string
  onDeploy: () => void
  onContinue: () => void
}) {
  const copy = (value: string) => navigator.clipboard?.writeText(value)
  return <div className="deploy-panel"><div className="panel-heading"><div><span className="panel-number">05</span><h3>Your contract, deployed by you</h3></div><span className="local-pill"><LockKeyhole size={13} /> Retained on this device</span></div><p>The connected 1AM wallet will approve and fund a real Midnight deployment. The network creates a contract address for this worker; Lumen Commons stores the finalized public address and deployment transaction hash locally.</p>{deployment ? <div className="deployment-card"><div className="deployment-status"><CheckCircle2 /><div><strong>Retained deployment ready</strong><span>Midnight {deployment.network} · {new Date(deployment.deployed_at).toLocaleString()}</span></div></div><dl><div><dt>Contract address</dt><dd><code>{deployment.contract_address}</code><button className="copy-button" onClick={() => copy(deployment.contract_address)} aria-label="Copy contract address"><Copy /></button></dd></div><div><dt>Deployment transaction hash</dt><dd><code>{deployment.deployment_transaction_hash}</code><button className="copy-button" onClick={() => copy(deployment.deployment_transaction_hash)} aria-label="Copy deployment transaction hash"><Copy /></button></dd></div></dl><div className="deployment-actions"><button className="secondary-button" disabled={busy} onClick={onDeploy}><Rocket size={17} /> Deploy a fresh contract</button><button className="primary-button" onClick={onContinue}>Use retained contract <ArrowRight size={17} /></button></div></div> : <div className="deployment-empty"><div className="deploy-symbol"><Rocket /></div><div><strong>No contract retained for this wallet and network</strong><span>Deployment generates a new on-chain address after wallet approval and finalization.</span></div><button className="primary-button" disabled={busy} onClick={onDeploy}>{busy ? 'Deploying and waiting for finalization…' : 'Deploy with 1AM'} <ArrowRight size={17} /></button></div>}{error && <p className="proof-error" role="alert">{error}</p>}<p className="micro-note">Only the public address and transaction hash are displayed. Constructor secrets and maintenance keys remain in this browser’s local private-state store.</p></div>
}

function Prove({ progress, busy, error, onProve }: { progress: ProofPhase; busy: boolean; error: string; onProve: () => void }) {
  return <div><ProofProgress progress={progress} /><div className="panel-actions proof-actions"><button className="primary-button" disabled={busy} onClick={onProve}>{busy ? 'Proof running…' : 'Generate real Midnight proof'} <ArrowRight size={17} /></button></div>{error && <p className="proof-error" role="alert">{error}</p>}</div>
}

function Receipt({ category, network, receipt, deployment }: { category: string; network: MidnightNetwork; receipt: PublicReceipt | null; deployment: ContractDeployment | null }) {
  const finalized = Boolean(receipt)
  return <div className="receipt"><div className="receipt-check"><Check /></div><span className="eyebrow">{finalized ? 'Finalized on Midnight' : 'No finalized transaction'}</span><h3>{finalized ? 'Your response is part of the public record.' : 'A receipt appears only after real wallet approval and finalization.'}</h3><p>{finalized ? 'The transaction contains the agreed disclosure scope, not your private credential.' : 'No transaction ID is shown because Midnight has not returned one.'}</p><dl><div><dt>Network</dt><dd>Midnight {network}</dd></div><div><dt>Disclosure</dt><dd>{category} · eligibility satisfied</dd></div><div><dt>Status</dt><dd><span className={finalized ? 'status-pill' : 'status-pill pending'}><i /> {finalized ? 'Finalized' : 'Not submitted'}</span></dd></div>{deployment && <><div><dt>Contract</dt><dd className="tx-id">{deployment.contract_address}</dd></div><div><dt>Deployment tx</dt><dd className="tx-id">{deployment.deployment_transaction_hash}</dd></div></>}{receipt && <div><dt>Response tx</dt><dd className="tx-id">{receipt.transaction_id}</dd></div>}</dl></div>
}

function Metrics({ metrics }: { metrics: PublicMetrics | null }) {
  const total = metrics?.finalized_proofs ?? 0
  const percentage = (count: number) => total ? Math.round((count / total) * 100) : 0
  const support = metrics?.support_count ?? 0
  const unsure = metrics?.unsure_count ?? 0
  const concern = metrics?.concern_count ?? 0
  return <div className="metrics-grid" aria-live="polite"><article><span>{percentage(support)}%</span><strong>Support</strong><small>{support} responses</small></article><article><span>{percentage(unsure)}%</span><strong>Unsure</strong><small>{unsure} responses</small></article><article><span>{percentage(concern)}%</span><strong>Concern</strong><small>{concern} responses</small></article><article className="metric-note"><Network /><strong>{total} finalized proofs</strong><small>Public aggregate from the Render API</small></article></div>
}

export default App
