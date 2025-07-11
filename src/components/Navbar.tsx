import React from 'react';

const Navbar: React.FC = () => {
    return (
        <div className="flex items-center justify-between bg-blue-900 p-4">
            {/* Left Logo */}
            <img
                src="/apcid.jpg"
                alt="Left Logo"
                className="h-20"
            />

            {/* Title */}
            <div className="text-center">
                <h1 className="text-white text-2xl font-bold">
                    CRIME INVESTIGATION DEPARTMENT
                </h1>
                <span className="text-white text-lg">
                    ANDHRA PRADESH
                </span>
            </div>

            {/* Right Logo */}
            <img
                src="/ap_police.png"
                alt="Right Logo"
                className="h-20"
            />
        </div>
    );
};

export default Navbar;