'use client'
import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Navbar from '@/components/Navbar';

const UnauthorizedPage = () => {
    const { data: session } = useSession();

    const handleSignIn = () => {
        signIn(); // Redirect to sign-in page
    };

    const handleSwitchAccount = () => {
        signOut({ callbackUrl: '/login' }); // Sign out and redirect to /signin page
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex flex-col items-center justify-center flex-grow bg-gray-100">
                <h1 className="text-3xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
                <p className="text-lg text-gray-700 mb-6">
                    {session
                        ? 'You need admin access to view this page. Please sign out and log in with different credentials.'
                        : 'You are not signed in. Please sign in to access this page.'}
                </p>
                <div className="space-x-4">
                    {!session ? (
                        <button
                            onClick={handleSignIn}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Sign In
                        </button>
                    ) : (
                        <button
                            onClick={handleSwitchAccount}
                            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                        >
                            Sign In with a Different Account
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
