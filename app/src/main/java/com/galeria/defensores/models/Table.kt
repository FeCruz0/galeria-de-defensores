package com.galeria.defensores.models

import java.util.UUID

data class Table(
    val id: String = UUID.randomUUID().toString(),
    var name: String = "",
    var description: String = "",
    val masterId: String = "",
    val players: MutableList<String> = mutableListOf(),
    var isPrivate: Boolean = false
)
