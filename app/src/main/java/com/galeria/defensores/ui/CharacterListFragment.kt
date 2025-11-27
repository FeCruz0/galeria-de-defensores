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
import com.galeria.defensores.ui.CharacterSheetFragment
import com.google.android.material.floatingactionbutton.FloatingActionButton

class CharacterListFragment : Fragment() {

    private lateinit var characterRecyclerView: RecyclerView
    private lateinit var adapter: CharacterAdapter
    private var tableId: String? = null

    companion object {
        private const val ARG_TABLE_ID = "table_id"

        fun newInstance(tableId: String): CharacterListFragment {
            val fragment = CharacterListFragment()
            val args = Bundle()
            args.putString(ARG_TABLE_ID, tableId)
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.let {
            tableId = it.getString(ARG_TABLE_ID)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_character_list, container, false)
        characterRecyclerView = view.findViewById(R.id.character_recycler_view)
        characterRecyclerView.layoutManager = LinearLayoutManager(context)
        loadCharacters()

        // FAB to add new character (optional, kept for future use)
        view.findViewById<FloatingActionButton>(R.id.fab_add_character).setOnClickListener {
            // TODO: implement add character flow
        }
        return view
    }

    private fun loadCharacters() {
        val characters = CharacterRepository.getCharacters(tableId)
        adapter = CharacterAdapter(characters) { character ->
            openCharacterSheet(character.id)
        }
        characterRecyclerView.adapter = adapter
    }

    private fun openCharacterSheet(characterId: String?) {
        val fragment = CharacterSheetFragment.newInstance(characterId, tableId)
        parentFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, fragment)
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
                itemView.setOnClickListener { onItemClick(character) }
            }
        }
    }
}