<?php

namespace App\Notifications\Frontend;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Order;

class OrderPlacedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $order;

    /**
     * Create a new notification instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function signatures($notifiable): array
    {
        return ['mail']; // Future: add 'database', 'sms'
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject('Xác nhận đặt hàng thành công #' . $this->order->order_code)
                    ->greeting('Xin chào ' . $this->order->customer_name . '!')
                    ->line('Cảm ơn bạn đã mua sản phẩm tại hệ thống website của chúng tôi.')
                    ->line('Đơn hàng của bạn đã được ghi nhận với mã: **#' . $this->order->order_code . '**')
                    ->action('Xem chi tiết đơn hàng', url('/customer/orders/' . $this->order->id))
                    ->line('Chúng tôi sẽ sớm liên hệ với bạn để xác nhận thông tin giao hàng.')
                    ->line('Trân trọng cảm ơn!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_code' => $this->order->order_code,
            'total_amount' => $this->order->total_amount,
        ];
    }
}
