import confetti from 'canvas-confetti';

export default function useConfetti() {
    return () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
        });
    };
}
