import { useEffect, useRef } from 'react';

export function useBackButtonClose(isOpen, onClose, modalId = 'modal') {
    const isPoppedRef = useRef(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;

        // Check if we are already in this state to avoid duplicate pushes
        if (window.history.state?.modal !== modalId) {
            window.history.pushState({ modal: modalId }, '');
        }
        isPoppedRef.current = false;

        const handlePopState = () => {
            isPoppedRef.current = true;
            onCloseRef.current?.();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (!isPoppedRef.current && window.history.state?.modal === modalId) {
                // Component closed by UI button, pop the state we pushed
                window.history.back();
            }
        };
    }, [isOpen, modalId]);
}
