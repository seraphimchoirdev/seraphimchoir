'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Show splash for at least 1.5 seconds to ensure logo is seen
        const timer = setTimeout(() => {
            setIsFading(true);
            // Wait for fade out animation (e.g. 500ms)
            setTimeout(() => {
                setIsVisible(false);
            }, 500);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'
                }`}
        >
            <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-700">
                <Image
                    src="/images/logo_seraphim_on.png"
                    alt="새로핌:On"
                    width={240}
                    height={80}
                    className="w-48 h-auto object-contain md:w-64"
                    priority
                />
            </div>
        </div>
    );
}
