<?php

namespace App\Notifications\Frontend\Auth;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CustomerWelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Chào mừng bạn đến với Hệ Thống Website: .....!')
            ->greeting('Xin chào ' . ($notifiable->last_name . ' ' . $notifiable->first_name) . '!')
            ->line('Cảm ơn bạn đã đăng ký tài khoản tại hệ thống của chúng tôi.')
            ->line('Tài khoản của bạn đã được khởi tạo thành công và sẵn sàng để sử dụng.')
            ->action('Đăng nhập ngay', url('/signin'))
            ->line('Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.')
            ->line('Trân trọng,')
            ->salutation('Đội ngũ Hệ Thống Website: .....');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
