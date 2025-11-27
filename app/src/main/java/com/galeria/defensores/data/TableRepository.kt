package com.galeria.defensores.data

import com.galeria.defensores.models.Table

object TableRepository {
    private val tables = mutableListOf<Table>()

    init {
        // Add a default table for testing
        tables.add(Table(name = "Mesa Exemplo", description = "Uma mesa de teste", masterId = "mock-master-id"))
    }

    fun getTables(): List<Table> {
        return tables.toList()
    }

    fun getTable(id: String): Table? {
        return tables.find { it.id == id }
    }

    fun addTable(table: Table) {
        tables.add(table)
    }

    fun updateTable(table: Table) {
        val index = tables.indexOfFirst { it.id == table.id }
        if (index >= 0) {
            tables[index] = table
        }
    }

    fun deleteTable(id: String) {
        tables.removeAll { it.id == id }
    }

    fun addPlayerToTable(tableId: String, playerId: String) {
        val table = getTable(tableId)
        if (table != null && !table.players.contains(playerId)) {
            table.players.add(playerId)
        }
    }
}
