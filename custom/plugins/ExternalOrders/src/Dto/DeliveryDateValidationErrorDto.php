<?php declare(strict_types=1);

namespace ExternalOrders\Dto;

final class DeliveryDateValidationErrorDto
{
    public function __construct(
        public readonly string $field,
        public readonly string $message,
        public readonly string $code,
    ) {
    }

    /**
     * @return array{field:string,message:string,code:string}
     */
    public function toArray(): array
    {
        return [
            'field' => $this->field,
            'message' => $this->message,
            'code' => $this->code,
        ];
    }
}
