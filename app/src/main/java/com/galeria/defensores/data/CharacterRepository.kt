package com.galeria.defensores.data

import com.galeria.defensores.models.Character
import kotlinx.coroutines.tasks.await

object CharacterRepository {
    private val collection = FirebaseConfig.firestore.collection("characters")

    suspend fun getCharacters(tableId: String? = null): List<Character> {
        return if (tableId != null) {
            val snapshot = collection.whereEqualTo("tableId", tableId).get().await()
            snapshot.toObjects(Character::class.java)
        } else {
            val snapshot = collection.get().await()
            snapshot.toObjects(Character::class.java)
        }
    }

    suspend fun getCharacter(id: String): Character? {
        val snapshot = collection.document(id).get().await()
        return snapshot.toObject(Character::class.java)
    }

    suspend fun saveCharacter(character: Character) {
        collection.document(character.id).set(character).await()
    }

    suspend fun deleteCharacter(id: String) {
        collection.document(id).delete().await()
    }
}
