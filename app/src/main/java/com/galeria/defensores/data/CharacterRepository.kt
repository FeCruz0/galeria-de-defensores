package com.galeria.defensores.data

import com.galeria.defensores.models.Character

object CharacterRepository {
    private val characters = mutableListOf<Character>()

    init {
        // Add a default character for testing
        characters.add(Character(name = "Defensor Inicial"))
    }

    fun getCharacters(tableId: String? = null): List<Character> {
        return if (tableId != null) {
            characters.filter { it.tableId == tableId }
        } else {
            characters.toList()
        }
    }

    fun getCharacter(id: String): Character? {
        return characters.find { it.id == id }
    }

    fun saveCharacter(character: Character) {
        val index = characters.indexOfFirst { it.id == character.id }
        if (index >= 0) {
            characters[index] = character
        } else {
            characters.add(character)
        }
    }

    fun deleteCharacter(id: String) {
        characters.removeAll { it.id == id }
    }
}
