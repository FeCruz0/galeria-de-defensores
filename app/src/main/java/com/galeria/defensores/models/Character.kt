package com.galeria.defensores.models

import java.util.UUID

data class Character(
    val id: String = UUID.randomUUID().toString(),
    var name: String = "Defensor",
    
    // Attributes
    var forca: Int = 0,
    var habilidade: Int = 0,
    var resistencia: Int = 0,
    var armadura: Int = 0,
    var poderFogo: Int = 0,
    
    // Status
    var currentPv: Int = 1,
    var currentPm: Int = 1,
    
    // Lists (storing as simple Strings or custom objects if needed, using Strings for simplicity as per React 'SimpleItem')
    var vantagens: MutableList<AdvantageItem> = mutableListOf(),
    var desvantagens: MutableList<AdvantageItem> = mutableListOf(),
    var pericias: MutableList<SimpleItem> = mutableListOf(),
    var magias: MutableList<SimpleItem> = mutableListOf(),
    var itens: MutableList<SimpleItem> = mutableListOf(),
    var equipamentos: MutableList<SimpleItem> = mutableListOf(),
    
    var anotacoes: String = ""
) {
    fun getMaxPv(): Int = (resistencia * 5).coerceAtLeast(1)
    fun getMaxPm(): Int = (resistencia * 5).coerceAtLeast(1)
}

data class AdvantageItem(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val description: String,
    val cost: String = ""
)

data class SimpleItem(
    val id: String = UUID.randomUUID().toString(),
    val text: String
)