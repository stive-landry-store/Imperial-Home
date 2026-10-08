import { Link } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Helmet } from 'react-helmet-async'

import { useTranslation } from 'react-i18next'

import { fetchAllProperties } from '../../lib/data'

import { invalidateSiteData } from '../../lib/queryCache'

import { supabase } from '../../lib/supabase'

import { coverImage, formatXaf } from '../../lib/format'

import { Button } from '../../components/ui/Button'

import { Badge } from '../../components/ui/Badge'



export function AdminPropertiesPage() {

  const { t } = useTranslation()

  const client = useQueryClient()

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-properties'], queryFn: fetchAllProperties })



  const remove = useMutation({

    mutationFn: async (row: { id: string; name: string }) => {

      if (!supabase) throw new Error(t('admin.roomNeedSupabase'))

      const { count, error: countError } = await supabase

        .from('reservations')

        .select('id', { count: 'exact', head: true })

        .eq('property_id', row.id)

      if (countError) throw countError

      if (count && count > 0) throw new Error(t('admin.roomDeleteBlocked'))

      const { error } = await supabase.from('properties').delete().eq('id', row.id)

      if (error) throw error

    },

    onSuccess: () => void invalidateSiteData(client),

  })



  function askDelete(id: string, name: string) {

    if (!window.confirm(t('admin.roomDeleteConfirm', { name }))) return

    remove.mutate({ id, name })

  }



  return (

    <div className="px-4 py-5 md:p-10">

      <Helmet>

        <title>{t('admin.properties')} | Impérial Home</title>

      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="font-display text-4xl">{t('admin.properties')}</h1>

          <p className="mt-2 text-base text-[var(--muted-fg)]">{t('admin.roomsLead')}</p>

        </div>

        <Button to="/admin/properties/new">{t('admin.roomAdd')}</Button>

      </div>



      {remove.error ? (

        <p className="mt-4 text-sm text-red-600">{remove.error instanceof Error ? remove.error.message : t('admin.roomDeleteError')}</p>

      ) : null}



      <div className="surface-light mt-8 overflow-x-auto border border-line">

        <table className="min-w-full text-left text-base">

          <thead className="bg-cream text-sm uppercase tracking-wider">

            <tr>

              <th className="px-4 py-4">{t('admin.roomPhoto')}</th>

              <th className="px-4 py-4">{t('admin.roomName')}</th>

              <th className="px-4 py-4">{t('admin.roomLocation')}</th>

              <th className="px-4 py-4">{t('admin.roomStatus')}</th>

              <th className="px-4 py-4">{t('admin.roomPrice')}</th>

              <th className="px-4 py-3" />

            </tr>

          </thead>

          <tbody>

            {isLoading ? (

              <tr>

                <td colSpan={6} className="px-4 py-8 text-[var(--surface-muted)]">

                  {t('common.loading')}

                </td>

              </tr>

            ) : null}

            {!isLoading && data.length === 0 ? (

              <tr>

                <td colSpan={6} className="px-4 py-8 text-[var(--surface-muted)]">

                  {t('admin.roomsEmpty')}

                </td>

              </tr>

            ) : null}

            {data.map((p) => {

              const photo = coverImage(p.property_images)

              return (

                <tr key={p.id} className="border-t border-line">

                  <td className="px-4 py-4">

                    {photo ? (

                      <img src={photo} alt="" className="h-14 w-20 rounded border border-line object-cover" />

                    ) : (

                      <div className="flex h-14 w-20 items-center justify-center rounded border border-dashed border-line text-xs text-[var(--surface-muted)]">

                        —

                      </div>

                    )}

                  </td>

                  <td className="px-4 py-4">

                    <p className="font-medium text-[var(--surface-fg)]">{p.name}</p>

                    <p className="text-sm text-[var(--surface-muted)]">{p.slug}</p>

                  </td>

                  <td className="px-4 py-4 text-[var(--surface-fg)]">

                    <p>{p.address}</p>

                    <p className="text-sm text-[var(--surface-muted)]">

                      {p.neighborhood ? `${p.neighborhood}, ` : ''}

                      {p.city}

                    </p>

                  </td>

                  <td className="px-4 py-4">

                    <Badge variant="light">
                      {t(
                        (
                          {
                            published: 'admin.statusPublished',
                            draft: 'admin.statusDraft',
                            unpublished: 'admin.statusUnpublished',
                            archived: 'admin.statusArchived',
                          } as const
                        )[p.status],
                      )}
                    </Badge>

                  </td>

                  <td className="px-4 py-4 font-medium text-[var(--surface-fg)]">{formatXaf(p.nightly_rate_xaf)}</td>

                  <td className="px-4 py-4 text-right">

                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">

                      <Link

                        to={`/admin/properties/${p.id}`}

                        className="text-sm uppercase tracking-wider text-[var(--surface-fg)] hover:text-[#c4a35a]"

                      >

                        {t('admin.roomEditBtn')}

                      </Link>

                      <button

                        type="button"

                        className="text-sm uppercase tracking-wider text-red-700 hover:text-red-900"

                        onClick={() => askDelete(p.id, p.name)}

                        disabled={remove.isPending}

                      >

                        {t('admin.roomDelete')}

                      </button>

                    </div>

                  </td>

                </tr>

              )

            })}

          </tbody>

        </table>

      </div>

    </div>

  )

}

