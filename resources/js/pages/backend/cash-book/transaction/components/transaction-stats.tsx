export interface Stats {
    total_receipt: number
    total_payment: number
    total_transfer: number
    current_balance: number
    receipt_count: number
    payment_count: number
    transfer_count: number
    opening_balance?: number
    cash_balance?: number
    bank_balance?: number
}

interface TransactionStatsProps {
    stats: Stats
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

export default function TransactionStats({ stats }: TransactionStatsProps) {
    const openingBalance = stats.opening_balance || 0
    const cashBalance = stats.cash_balance ?? 0
    const bankBalance = stats.bank_balance ?? 0

    return (
        <div className="bg-white p-6 border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
                {/* Left side - Formula display */}
                <div className="flex items-center justify-between flex-1 pr-8">
                    {/* Quỹ đầu kỳ */}
                    <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1 font-medium">Quỹ đầu kỳ</div>
                        <div className="text-lg font-bold text-gray-800">
                            {formatCurrency(openingBalance)}
                        </div>
                    </div>

                    <div className="text-gray-300 text-2xl font-light">+</div>

                    {/* Tổng thu */}
                    <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1 font-medium flex items-center justify-center gap-1">
                            Tổng thu
                            <span className="text-gray-400 cursor-help" title="Tổng tiền thu">ⓘ</span>
                        </div>
                        <div className="text-lg font-bold text-green-500">
                            {formatCurrency(stats.total_receipt)}
                        </div>
                    </div>

                    <div className="text-gray-300 text-2xl font-light">−</div>

                    {/* Tổng chi */}
                    <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1 font-medium flex items-center justify-center gap-1">
                            Tổng chi
                            <span className="text-gray-400 cursor-help" title="Tổng tiền chi">ⓘ</span>
                        </div>
                        <div className="text-lg font-bold text-red-500">
                            {formatCurrency(stats.total_payment)}
                        </div>
                    </div>

                    <div className="text-gray-300 text-2xl font-light">=</div>

                    {/* Tồn quỹ */}
                    <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1 font-medium flex items-center justify-center gap-1">
                            Tồn quỹ
                            <span className="text-gray-400 cursor-help" title="Tổng tồn quỹ hiện tại">ⓘ</span>
                        </div>
                        <div className={`text-lg font-bold ${stats.current_balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                            {formatCurrency(stats.current_balance)}
                        </div>
                    </div>
                </div>

                {/* Right side - Balance breakdown */}
                <div className="bg-sky-50 rounded-lg px-6 py-3 ml-8 min-w-[300px]">
                    <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 font-medium">Quỹ tiền mặt:</span>
                            <span className={`font-bold ${cashBalance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                                {formatCurrency(cashBalance)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 font-medium">Quỹ tiền gửi:</span>
                            <span className="font-bold text-gray-900">
                                {formatCurrency(bankBalance)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
