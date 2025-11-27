package com.galeria.defensores.models

import java.util.UUID

data class User(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val phoneNumber: String
)
