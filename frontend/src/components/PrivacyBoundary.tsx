import { Eye, EyeOff, LockKeyhole, Radio } from 'lucide-react'
import { motion } from 'framer-motion'

const privateItems = ['Name and wallet address', 'Exact district credential', 'Age and birth data', 'Private notes']
const publicItems = ['Campaign identifier', 'Eligibility satisfied', 'Response category', 'One-response nullifier']

export function PrivacyBoundary() {
  return (
    <section className="boundary" aria-labelledby="privacy-boundary-title">
      <div className="section-heading">
        <span className="eyebrow"><LockKeyhole size={14} /> Privacy boundary</span>
        <h2 id="privacy-boundary-title">A proof crosses the line. Your data does not.</h2>
      </div>
      <div className="boundary-grid">
        <motion.div className="boundary-side private-side" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="boundary-title"><EyeOff size={18} /><strong>Stays on this device</strong></div>
          <ul>{privateItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <span className="boundary-foot">Encrypted local state · never sent to our API</span>
        </motion.div>
        <div className="proof-gate" aria-hidden="true">
          <span>Zero-knowledge proof</span>
          <div className="gate-line"><i /><Radio size={18} /><i /></div>
          <small>truth without the source data</small>
        </div>
        <motion.div className="boundary-side public-side" initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="boundary-title"><Eye size={18} /><strong>Becomes public</strong></div>
          <ul>{publicItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <span className="boundary-foot">Auditable on Midnight · no identity attached</span>
        </motion.div>
      </div>
    </section>
  )
}

