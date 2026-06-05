import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0, y: -8, scale: 0.98,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
}

export default function AnimatedPage({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
