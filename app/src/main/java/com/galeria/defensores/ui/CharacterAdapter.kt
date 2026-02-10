package com.galeria.defensores.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.data.UserRepository
import com.galeria.defensores.databinding.ItemCharacterBinding
import com.galeria.defensores.models.Character
import kotlinx.coroutines.launch

class CharacterAdapter(
    private var characters: List<Character>,
    private var isMaster: Boolean,
    private var currentUserId: String?,
    private val onItemClick: (Character) -> Unit,
    private val onDeleteClick: (Character) -> Unit
) : RecyclerView.Adapter<CharacterAdapter.CharacterViewHolder>() {

    fun updateData(newCharacters: List<Character>, newIsMaster: Boolean, newCurrentUserId: String?) {
        characters = newCharacters
        isMaster = newIsMaster
        currentUserId = newCurrentUserId
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CharacterViewHolder {
        val binding = ItemCharacterBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return CharacterViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CharacterViewHolder, position: Int) {
        holder.bind(characters[position])
    }

    override fun getItemCount(): Int = characters.size

    inner class CharacterViewHolder(private val binding: ItemCharacterBinding) : RecyclerView.ViewHolder(binding.root) {
        private var boundCharacterId: String? = null

        fun bind(character: Character) {
            boundCharacterId = character.id
            binding.characterName.text = if (character.isHidden) {
                itemView.context.getString(R.string.character_hidden_suffix).let { suffix ->
                    "${character.name} $suffix"
                }
            } else {
                character.name
            }

            binding.characterDescription.text = "F:${character.forca} H:${character.habilidade} R:${character.resistencia} A:${character.armadura} PdF:${character.poderFogo}"

            if (character.ownerName.isNotEmpty()) {
                binding.characterCreator.text = itemView.context.getString(R.string.created_by, character.ownerName)
            } else if (character.ownerId.isNotEmpty()) {
                binding.characterCreator.text = itemView.context.getString(R.string.created_by_loading)
                val currentId = character.id
                itemView.findViewTreeLifecycleOwner()?.lifecycleScope?.launch {
                    val user = UserRepository.getUser(character.ownerId)
                    if (user != null && boundCharacterId == currentId) {
                        character.ownerName = user.name
                        binding.characterCreator.text = itemView.context.getString(R.string.created_by, user.name)
                    }
                }
            } else {
                binding.characterCreator.text = itemView.context.getString(R.string.created_by_unknown)
            }

            itemView.alpha = if (character.isHidden) 0.5f else 1.0f

            val isOwner = character.ownerId == currentUserId
            binding.btnDeleteCharacter.visibility = if (isMaster || isOwner) View.VISIBLE else View.GONE
            binding.btnDeleteCharacter.setOnClickListener { onDeleteClick(character) }

            itemView.setOnClickListener { onItemClick(character) }
        }
    }
}
