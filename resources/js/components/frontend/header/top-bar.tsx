export default function TopBar() {
    return (
        <div className="bg-cyan-700 text-white text-xs py-2 hidden md:block">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {/* Countdown Demo */}
                    <span>Until the end of the sale: <span className="font-bold">682 Days</span> 17 Hours 33 Minutes</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="hidden lg:inline">Buy one get one free on <span className="font-bold text-yellow-300">first order</span></span>
                    <span className="flex items-center gap-1">Track Your Order</span>
                    <div className="w-px h-3 bg-white/20"></div>
                    <span>About Us</span>
                    <span>English</span>
                    <span>USD</span>
                </div>
            </div>
        </div>
    );
}
