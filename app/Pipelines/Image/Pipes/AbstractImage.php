<?php  
namespace App\Pipelines\Image\Pipes;

class AbstractImage {
    protected $options;

    public function __construct(
        array $options = []
    )
    {
        $this->options = $options;
    }
}