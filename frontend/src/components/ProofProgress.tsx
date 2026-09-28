import { Check, CircleDashed, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

const labels = ['Validate locally', 'Generate proof', 'Wallet approval', 'Finalize on Midnight']

export function ProofProgress({ progress }: { progress: number }) {
  return (
    <div className="proof-progress" role="status" aria-live="polite">
      <div className="proof-orbit" aria-hidden="true">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}><CircleDashed /></motion.div>
        <ShieldCheck />
      </div>
      <div>
        <span className="eyebrow">Proof in progress</span>
        <h3>{labels[Math.min(progress, labels.length - 1)]}</h3>
        <div className="progress-track"><motion.i animate={{ width: `${((progress + 1) / labels.length) * 100}%` }} /></div>
        <ol className="progress-steps">
          {labels.map((label, index) => <li className={index <= progress ? 'done' : ''} key={label}>{index < progress ? <Check size={14} /> : <span>{index + 1}</span>}{label}</li>)}
        </ol>
      </div>
    </div>
  )
}

