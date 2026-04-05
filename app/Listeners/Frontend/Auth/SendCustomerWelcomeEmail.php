<?php

namespace App\Listeners\Frontend\Auth;

use App\Models\Customer;
use App\Notifications\Frontend\Auth\CustomerWelcomeNotification;
use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendCustomerWelcomeEmail implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.bấm submit not fgoun
     */
    public function handle(Registered $event): void
    {
        // Kiểm tra xem user vừa đăng ký có phải là Customer không
        if ($event->user instanceof Customer) {
            $event->user->notify(new CustomerWelcomeNotification());
        }
    }
}
