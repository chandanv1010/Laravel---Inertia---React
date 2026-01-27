<?php
namespace App\Services\Interfaces\Review;

use Illuminate\Http\Request;

/**
 * Interface for Review Service
 * 
 * Defines the contract for review-related operations
 */
interface ReviewServiceInterface
{
    /**
     * Paginate reviews with filters
     *
     * @param Request $request
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function paginate($request);

    /**
     * Create a new review
     *
     * @param array $payload
     * @return \App\Models\Review
     */
    public function create($payload);

    /**
     * Update an existing review
     *
     * @param int $id
     * @param array $payload
     * @return \App\Models\Review
     */
    public function update($id, $payload);

    /**
     * Delete a review
     *
     * @param int $id
     * @return bool
     */
    public function delete($id);

    /**
     * Find a review by ID
     *
     * @param int $id
     * @return \App\Models\Review
     */
    public function findById($id);

    /**
     * Update a specific field/status
     *
     * @param int $id
     * @param string $field
     * @param mixed $value
     * @return bool
     */
    public function updateStatus($id, $field, $value);

    /**
     * Bulk update multiple reviews
     *
     * @param array $payload
     * @return bool
     */
    public function bulkUpdate($payload);

    /**
     * Bulk delete multiple reviews
     *
     * @param array $ids
     * @return bool
     */
    public function bulkDestroy($ids);
}
