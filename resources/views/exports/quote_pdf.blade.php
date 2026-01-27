<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Báo Giá {{ $quote->code }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 14px; }
        .header { text-align: center; margin-bottom: 30px; }
        .info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { text-align: right; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>BÁO GIÁ</h1>
        <p>Mã: {{ $quote->code }}</p>
        <p>Ngày: {{ $quote->created_at ? $quote->created_at->format('d/m/Y') : date('d/m/Y') }}</p>
    </div>

    <div class="info">
        <strong>Khách hàng:</strong> {{ $quote->customer_name }}<br>
        @if($quote->customer_address)
            <strong>Địa chỉ:</strong> {{ $quote->customer_address }}<br>
        @endif
        @if($quote->customer_phone)
            <strong>Điện thoại:</strong> {{ $quote->customer_phone }}<br>
        @endif
    </div>

    <table>
        <thead>
            <tr>
                <th>STT</th>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quote->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item->product_name }}</td>
                <td>{{ $item->quantity }}</td>
                <td>{{ number_format($item->price) }}</td>
                <td>{{ number_format($item->total) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="total">
        <p>Tổng cộng: {{ number_format($quote->total_amount) }} VNĐ</p>
        @if($quote->discount_amount > 0)
            <p>Chiết khấu: -{{ number_format($quote->discount_amount) }} VNĐ</p>
        @endif
        @if($quote->tax_amount > 0)
            <p>Thuế: +{{ number_format($quote->tax_amount) }} VNĐ</p>
        @endif
        <p style="font-size: 16px; margin-top: 10px;">Thành tiền: {{ number_format($quote->final_amount) }} VNĐ</p>
    </div>

    @if($quote->note)
    <div class="note">
        <strong>Ghi chú:</strong>
        <p>{{ $quote->note }}</p>
    </div>
    @endif
</body>
</html>
