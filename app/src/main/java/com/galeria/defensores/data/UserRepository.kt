package com.galeria.defensores.data

import com.galeria.defensores.models.User
import kotlinx.coroutines.tasks.await

import kotlinx.coroutines.withTimeout

object UserRepository {
    private val collection = FirebaseConfig.firestore.collection("users")

    suspend fun findUserByPhone(phone: String): User? {
        return withTimeout(60000) {
            val snapshot = collection.whereEqualTo("phoneNumber", phone).get().await()
            if (!snapshot.isEmpty) {
                snapshot.documents[0].toObject(User::class.java)
            } else {
                null
            }
        }
    }

    suspend fun registerUser(user: User) {
        withTimeout(60000) {
            collection.document(user.id).set(user).await()
        }
    }
    
    suspend fun getUser(id: String): User? {
        if (id.isBlank()) return null
        return withTimeout(60000) {
            val snapshot = collection.document(id).get().await()
            snapshot.toObject(User::class.java)
        }
    }
}
