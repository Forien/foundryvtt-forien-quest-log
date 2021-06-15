export default class Reward
{
   constructor(data = {})
   {
      this._type = data.type || null;
      this._data = data.data || {};
      this._hidden = data.hidden || false;
   }

   get data()
   {
      return this._data;
   }

   set data(data)
   {
      this._data = data;
   }

   get hidden()
   {
      return this._hidden;
   }

   set hidden(value)
   {
      this._hidden = value;
   }

   get isValid()
   {
      return (this._type !== null);
   }

   get type()
   {
      return this._type;
   }

   set type(type)
   {
      this._type = type;
   }

   toJSON()
   {
      return {
         type: this._type,
         data: this._data,
         hidden: this._hidden
      };
   }

   async toggleVisible()
   {
      this._hidden = !this._hidden;

      return this._hidden;
   }
}
