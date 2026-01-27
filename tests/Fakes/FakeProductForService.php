<?php

namespace Tests\Fakes;

use Illuminate\Database\Eloquent\Model;

/**
 * Minimal fake Product model for service unit tests.
 * Avoids strict return type constraints on relationship methods.
 */
class FakeProductForService extends Model
{
    public $timestamps = false;

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        // emulate persisted model in tests when needed
        $this->exists = true;
    }

    public function getRelationable()
    {
        return [];
    }

    public function product_catalogues()
    {
        return new class {
            public function sync($ids) { return true; }
        };
    }

    public function languages()
    {
        return new class {
            public function syncWithoutDetaching($payload) { return true; }
        };
    }

    public function tags()
    {
        return new class {
            public array $synced = [];
            public function sync($ids) { $this->synced = $ids; return true; }
        };
    }

    public function routers()
    {
        return new class {
            public function exists() { return false; }
            public function first() { return null; }
        };
    }

    public function relationLoaded($relation)
    {
        return false;
    }

    public function saveQuietly(array $options = [])
    {
        return true;
    }
}

