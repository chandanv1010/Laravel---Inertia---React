<?php

namespace App\Http\Resources\Customer;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class CustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'date_of_birth' => $this->date_of_birth ? Carbon::parse($this->date_of_birth)->format('Y-m-d') : null,
            'gender' => $this->gender,
            'receive_promotional_emails' => $this->receive_promotional_emails,
            'shipping_last_name' => $this->shipping_last_name,
            'shipping_first_name' => $this->shipping_first_name,
            'shipping_company' => $this->shipping_company,
            'shipping_phone' => $this->shipping_phone,
            'shipping_country' => $this->shipping_country,
            'shipping_postal_code' => $this->shipping_postal_code,
            'shipping_province' => $this->shipping_province,
            'shipping_district' => $this->shipping_district,
            'shipping_ward' => $this->shipping_ward,
            'shipping_address' => $this->shipping_address,
            'use_new_address_format' => $this->use_new_address_format,
            'notes' => $this->notes,
            'customer_catalogue_id' => $this->customer_catalogue_id,
            'customer_catalogue' => $this->whenLoaded('customer_catalogue', function(){
                return $this->customer_catalogue;
            }),
            'creators' => $this->whenLoaded('creators', function(){
                return $this->creators;
            }),
            'publish' => $this->publish,
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y'),
        ];
    }
}
