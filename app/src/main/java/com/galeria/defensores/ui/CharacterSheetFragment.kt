package com.galeria.defensores.ui

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.galeria.defensores.R
import com.galeria.defensores.models.RollType
import com.galeria.defensores.viewmodels.CharacterViewModel

class CharacterSheetFragment : Fragment() {

    private lateinit var viewModel: CharacterViewModel
    private var characterId: String? = null

    // UI References
    private lateinit var nameEdit: EditText
    private lateinit var rollResultCard: CardView
    private lateinit var rollTotalText: TextView
    private lateinit var rollDetailText: TextView
    private lateinit var rollNameText: TextView

    companion object {
        private const val ARG_CHARACTER_ID = "character_id"

        fun newInstance(characterId: String?): CharacterSheetFragment {
            val fragment = CharacterSheetFragment()
            val args = Bundle()
            args.putString(ARG_CHARACTER_ID, characterId)
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.let {
            characterId = it.getString(ARG_CHARACTER_ID)
        }
        viewModel = ViewModelProvider(this).get(CharacterViewModel::class.java)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_character_sheet, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Bind UI
        nameEdit = view.findViewById(R.id.edit_char_name)
        rollResultCard = view.findViewById(R.id.card_roll_result)
        rollTotalText = view.findViewById(R.id.text_roll_total)
        rollDetailText = view.findViewById(R.id.text_roll_detail)
        rollNameText = view.findViewById(R.id.text_roll_name)

        // Setup Attributes
        setupAttributeInput(view.findViewById(R.id.attr_forca), "Força", 0, "#DC2626", "forca")
        setupAttributeInput(view.findViewById(R.id.attr_habilidade), "Habilidade", 0, "#D97706", "habilidade")
        setupAttributeInput(view.findViewById(R.id.attr_resistencia), "Resistência", 0, "#059669", "resistencia")
        setupAttributeInput(view.findViewById(R.id.attr_armadura), "Armadura", 0, "#2563EB", "armadura")
        setupAttributeInput(view.findViewById(R.id.attr_pdf), "Poder de Fogo", 0, "#7C3AED", "poderFogo")

        // Setup Status
        setupStatusManager(view.findViewById(R.id.status_pv), "Pontos de Vida", 0, "#DC2626", "pv")
        setupStatusManager(view.findViewById(R.id.status_pm), "Pontos de Magia", 0, "#2563EB", "pm")

        // Setup Combat Buttons
        view.findViewById<Button>(R.id.btn_attack_f).setOnClickListener { viewModel.rollDice(RollType.ATTACK_F) }
        view.findViewById<Button>(R.id.btn_attack_pdf).setOnClickListener { viewModel.rollDice(RollType.ATTACK_PDF) }
        view.findViewById<Button>(R.id.btn_defense).setOnClickListener { viewModel.rollDice(RollType.DEFENSE) }
        
        view.findViewById<View>(R.id.btn_reset).setOnClickListener { 
            parentFragmentManager.popBackStack()
        }

        // Name Listener
        nameEdit.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                if (nameEdit.hasFocus()) {
                    viewModel.updateName(s.toString())
                }
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        // Observe Data
        viewModel.loadCharacter(characterId)

        viewModel.character.observe(viewLifecycleOwner) { char ->
            if (!nameEdit.hasFocus()) {
                nameEdit.setText(char.name)
            }
            
            updateAttributeValue(view.findViewById(R.id.attr_forca), char.forca)
            updateAttributeValue(view.findViewById(R.id.attr_habilidade), char.habilidade)
            updateAttributeValue(view.findViewById(R.id.attr_resistencia), char.resistencia)
            updateAttributeValue(view.findViewById(R.id.attr_armadura), char.armadura)
            updateAttributeValue(view.findViewById(R.id.attr_pdf), char.poderFogo)

            updateStatusValue(view.findViewById(R.id.status_pv), char.currentPv, char.getMaxPv())
            updateStatusValue(view.findViewById(R.id.status_pm), char.currentPm, char.getMaxPm())
        }

        viewModel.lastRoll.observe(viewLifecycleOwner) { result ->
            if (result != null) {
                rollResultCard.visibility = View.VISIBLE
                rollNameText.text = result.name
                rollTotalText.text = result.total.toString()
                
                val critText = if (result.isCritical) " (CRÍTICO!)" else ""
                val bonusText = if (result.bonus > 0) " + ${result.bonus}" else ""
                
                rollDetailText.text = "H(${result.skillValue}) + ${result.attributeUsed}(${result.attributeValue}${if(result.isCritical) "x2" else ""}) + 1d6(${result.die})$bonusText$critText"
                
                if (result.isCritical) {
                    rollTotalText.setTextColor(Color.parseColor("#D97706")) // Yellow/Gold
                } else {
                    rollTotalText.setTextColor(Color.WHITE)
                }
            } else {
                rollResultCard.visibility = View.GONE
            }
        }

        viewModel.isRolling.observe(viewLifecycleOwner) { isRolling ->
            val buttons = listOf<Button>(
                view.findViewById(R.id.btn_attack_f),
                view.findViewById(R.id.btn_attack_pdf),
                view.findViewById(R.id.btn_defense)
            )
            buttons.forEach { it.isEnabled = !isRolling }
            
            if (isRolling) {
                rollResultCard.visibility = View.VISIBLE
                rollTotalText.setTextColor(Color.YELLOW)
            }
        }
    }

    private fun setupAttributeInput(view: View, label: String, iconRes: Int, colorHex: String, attrKey: String) {
        val labelView = view.findViewById<TextView>(R.id.attribute_label)
        val iconView = view.findViewById<ImageView>(R.id.attribute_icon)
        val inputView = view.findViewById<EditText>(R.id.attribute_input)

        labelView.text = label
        // iconView.setImageResource(iconRes) // Need to add icons or use defaults
        iconView.setColorFilter(Color.parseColor(colorHex))
        labelView.setTextColor(Color.parseColor(colorHex))

        inputView.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                if (inputView.hasFocus()) {
                    val value = s.toString().toIntOrNull() ?: 0
                    viewModel.updateAttribute(attrKey, value)
                }
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        view.findViewById<Button>(R.id.btn_minus).setOnClickListener {
            val currentValue = inputView.text.toString().toIntOrNull() ?: 0
            if (currentValue > 0) {
                viewModel.updateAttribute(attrKey, currentValue - 1)
                inputView.setText((currentValue - 1).toString())
            }
        }

        view.findViewById<Button>(R.id.btn_plus).setOnClickListener {
            val currentValue = inputView.text.toString().toIntOrNull() ?: 0
            if (currentValue < 99) {
                viewModel.updateAttribute(attrKey, currentValue + 1)
                inputView.setText((currentValue + 1).toString())
            }
        }
    }
    
    private fun updateAttributeValue(view: View, value: Int) {
        val inputView = view.findViewById<EditText>(R.id.attribute_input)
        if (!inputView.hasFocus()) {
            inputView.setText(value.toString())
        }
    }

    private fun setupStatusManager(view: View, label: String, iconRes: Int, colorHex: String, typeKey: String) {
        val labelView = view.findViewById<TextView>(R.id.status_label)
        val iconView = view.findViewById<ImageView>(R.id.status_icon)
        val barView = view.findViewById<ProgressBar>(R.id.status_bar)
        
        labelView.text = label
        // iconView.setImageResource(iconRes)
        iconView.setColorFilter(Color.parseColor(colorHex))
        labelView.setTextColor(Color.parseColor(colorHex))
        
        barView.progressTintList = ColorStateList.valueOf(Color.parseColor(colorHex))

        view.findViewById<Button>(R.id.btn_minus_5).setOnClickListener { viewModel.updateStatus(typeKey, -5) }
        view.findViewById<Button>(R.id.btn_minus_1).setOnClickListener { viewModel.updateStatus(typeKey, -1) }
        view.findViewById<Button>(R.id.btn_plus_1).setOnClickListener { viewModel.updateStatus(typeKey, 1) }
        view.findViewById<Button>(R.id.btn_plus_5).setOnClickListener { viewModel.updateStatus(typeKey, 5) }
    }

    private fun updateStatusValue(view: View, current: Int, max: Int) {
        val valueView = view.findViewById<TextView>(R.id.status_value)
        val barView = view.findViewById<ProgressBar>(R.id.status_bar)
        
        valueView.text = "$current / $max"
        barView.max = max
        barView.progress = current
    }
}
