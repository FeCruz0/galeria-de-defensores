package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.data.CharacterRepository
import com.galeria.defensores.models.Character
import com.google.android.material.floatingactionbutton.FloatingActionButton

class CharacterListFragment : Fragment() {

    private lateinit var characterRecyclerView: RecyclerView
    private lateinit var adapter: CharacterAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_character_list, container, false)
        
        characterRecyclerView = view.findViewById(R.id.character_recycler_view)
        characterRecyclerView.layoutManager = LinearLayoutManager(context)
        
        val fab = view.findViewById<FloatingActionButton>(R.id.fab_add_character)
        fab.setOnClickListener {
            openCharacterSheet(null)
        }

        view.findViewById<View>(R.id.btn_settings).setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragment_container, SettingsFragment())
                .addToBackStack(null)
                .commit()
        }

        return view
    }

    override fun onResume() {
        super.onResume()
        loadCharacters()
    }

    private fun loadCharacters() {
        val characters = CharacterRepository.getCharacters()
        adapter = CharacterAdapter(characters) { character ->
            openCharacterSheet(character.id)
        }
        characterRecyclerView.adapter = adapter
    }

    private fun openCharacterSheet(characterId: String?) {
        val fragment = CharacterSheetFragment.newInstance(characterId)
        parentFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, fragment) // Assuming MainActivity has a container with this ID
            .addToBackStack(null)
            .commit()
    }

    private inner class CharacterAdapter(
        private val characters: List<Character>,
        private val onItemClick: (Character) -> Unit
    ) : RecyclerView.Adapter<CharacterAdapter.CharacterViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CharacterViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_character, parent, false)
            return CharacterViewHolder(view)
        }

        override fun onBindViewHolder(holder: CharacterViewHolder, position: Int) {
            val character = characters[position]
            holder.bind(character)
        }

        override fun getItemCount(): Int = characters.size

        inner class CharacterViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            private val nameText: TextView = itemView.findViewById(R.id.character_name)
            private val descText: TextView = itemView.findViewById(R.id.character_description)

            fun bind(character: Character) {
                nameText.text = character.name
                descText.text = "F:${character.forca} H:${character.habilidade} R:${character.resistencia} A:${character.armadura} PdF:${character.poderFogo}"
                
                itemView.setOnClickListener {
                    onItemClick(character)
                }
            }
        }
    }
}