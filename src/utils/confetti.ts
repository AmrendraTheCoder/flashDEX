import confetti from 'canvas-confetti'

export const fireConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  })
}

export const fireStressTestConfetti = () => {
  const duration = 2000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#6366f1', '#10b981', '#f59e0b']
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#6366f1', '#10b981', '#f59e0b']
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }
  frame()
}

export const fireBigTradeConfetti = () => {
  confetti({
    particleCount: 50,
    spread: 60,
    startVelocity: 30,
    colors: ['#10b981', '#34d399', '#6ee7b7']
  })
}

export const fireAchievementConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.7 },
    colors: ['#f59e0b', '#fbbf24', '#fcd34d']
  })
}
