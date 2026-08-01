import { useEffect, useRef } from 'react';

export function useBackButtonClose(isOpen, onClose, modalId = 'modal') {
    const isPoppedRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            // Check if we are already in this state to avoid duplicate pushes
            if (window.history.state?.modal !== modalId) {
                window.history.pushState({ modal: modalId }, '');
            }
            isPoppedRef.current = false;

            const handlePopState = (e) => {
                isPoppedRef.current = true;
                onClose();
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
                if (!isPoppedRef.current && window.history.state?.modal === modalId) {
                    // Component closed by UI button, pop the state we pushed
                    window.history.back();
                }
            };
        }
    }, [isOpen, onClose, modalId]);
}
