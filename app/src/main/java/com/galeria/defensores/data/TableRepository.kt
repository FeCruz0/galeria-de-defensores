package com.galeria.defensores.data

import com.galeria.defensores.models.Table
import kotlinx.coroutines.tasks.await

object TableRepository {
    private val collection = FirebaseConfig.firestore.collection("tables")

    suspend fun getTables(): List<Table> {
        val snapshot = collection.get().await()
        val allTables = snapshot.toObjects(Table::class.java)
        val currentUser = SessionManager.currentUser
        
        return if (currentUser != null) {
            allTables.filter { table ->
                !table.isPrivate || 
                table.masterId == currentUser.id || 
                table.players.contains(currentUser.id)
            }
        } else {
            allTables.filter { !it.isPrivate }
        }
    }

    suspend fun getTable(id: String): Table? {
        val snapshot = collection.document(id).get().await()
        return snapshot.toObject(Table::class.java)
    }

    suspend fun addTable(table: Table) {
        collection.document(table.id).set(table).await()
    }

    suspend fun updateTable(table: Table) {
        collection.document(table.id).set(table).await()
    }

    suspend fun deleteTable(id: String) {
        collection.document(id).delete().await()
    }

    suspend fun addPlayerToTable(tableId: String, playerId: String) {
        val tableRef = collection.document(tableId)
        val snapshot = tableRef.get().await()
        val table = snapshot.toObject(Table::class.java)
        if (table != null && !table.players.contains(playerId)) {
            table.players.add(playerId)
            tableRef.set(table).await()
        }
    }
}
