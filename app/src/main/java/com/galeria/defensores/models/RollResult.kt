package com.galeria.defensores.models

data class RollResult(
    val total: Int,
    val die: Int,
    val attributeUsed: String,
    val attributeValue: Int,
    val skillValue: Int,
    val bonus: Int,
    val isCritical: Boolean,
    val timestamp: Long,
    val name: String
)

enum class RollType(val displayName: String) {
    ATTACK_F("Força"),
    ATTACK_PDF("Poder de Fogo"),
    DEFENSE("Armadura"),
    SPECIAL_F("Especial (F)"),
    SPECIAL_PDF("Especial (PdF)")
}
