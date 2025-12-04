package com.galeria.defensores.data

import com.galeria.defensores.models.Table
import kotlinx.coroutines.tasks.await

object TableRepository {
    private val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
    private val tablesCollection = db.collection("tables")

    suspend fun getTables(): List<Table> {
        return try {
            val snapshot = tablesCollection.get().await()
            snapshot.toObjects(Table::class.java)
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getTable(id: String): Table? {
        return try {
            val doc = tablesCollection.document(id).get().await()
            doc.toObject(Table::class.java)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun addTable(table: Table): Boolean {
        return try {
            tablesCollection.document(table.id).set(table).await()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun updateTable(table: Table): Boolean {
        return try {
            tablesCollection.document(table.id).set(table).await()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun deleteTable(id: String): Boolean {
        return try {
            tablesCollection.document(id).delete().await()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun addPlayerToTable(tableId: String, playerId: String) {
        try {
            val tableRef = tablesCollection.document(tableId)
            db.runTransaction { transaction ->
                val snapshot = transaction.get(tableRef)
                val table = snapshot.toObject(Table::class.java)
                if (table != null && !table.players.contains(playerId)) {
                    table.players.add(playerId)
                    transaction.set(tableRef, table)
                }
            }.await()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun addRollToHistory(tableId: String, roll: com.galeria.defensores.models.RollResult) {
        try {
            android.util.Log.d("TableRepoDebug", "Adding roll to history: tableId=$tableId, roll=${roll.total}")
            tablesCollection.document(tableId)
                .update("rollHistory", com.google.firebase.firestore.FieldValue.arrayUnion(roll))
                .await()
            android.util.Log.d("TableRepoDebug", "Roll added successfully")
        } catch (e: Exception) {
            android.util.Log.e("TableRepoDebug", "Error adding roll", e)
            e.printStackTrace()
        }
    }
}
