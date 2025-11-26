package com.galeria.defensores.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.models.AdvantageItem

class AdvantagesAdapter(
    private val items: List<AdvantageItem>,
    private val onDeleteClick: ((AdvantageItem) -> Unit)? = null,
    private val onItemClick: (AdvantageItem) -> Unit
) : RecyclerView.Adapter<AdvantagesAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.text_advantage_name)
        val cost: TextView = view.findViewById(R.id.text_advantage_cost)
        val description: TextView = view.findViewById(R.id.text_advantage_description)
        val deleteButton: View = view.findViewById(R.id.btn_delete_item)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_advantage, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.name.text = item.name
        holder.cost.text = item.cost
        holder.description.text = item.description
        
        if (onDeleteClick != null) {
            holder.deleteButton.visibility = View.VISIBLE
            holder.deleteButton.setOnClickListener { onDeleteClick.invoke(item) }
        } else {
            holder.deleteButton.visibility = View.GONE
        }

        holder.itemView.setOnClickListener { onItemClick(item) }
    }

    override fun getItemCount() = items.size
}
