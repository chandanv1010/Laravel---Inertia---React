<?php

use Illuminate\Support\Facades\DB;

// Get all users
$users = DB::table('users')->get();

echo "Found " . $users->count() . " users:\n";
foreach ($users as $user) {
    echo "  - ID: {$user->id}, Email: {$user->email}\n";
}

// Get all permissions
$permissions = DB::table('permissions')->pluck('id')->toArray();
echo "\nFound " . count($permissions) . " permissions\n";

// Grant all permissions to all users
foreach ($users as $user) {
    // Delete existing permissions for this user
    DB::table('user_catalogue_permission')
        ->where('user_catalogue_id', $user->user_catalogue_id)
        ->delete();

    // Insert all permissions
    $data = [];
    foreach ($permissions as $permissionId) {
        $data[] = [
            'user_catalogue_id' => $user->user_catalogue_id,
            'permission_id' => $permissionId,
        ];
    }

    if (!empty($data)) {
        DB::table('user_catalogue_permission')->insert($data);
        echo "✅ Granted all permissions to user: {$user->email}\n";
    }
}

echo "\n✅ Done! All users now have full permissions.\n";
